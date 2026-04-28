import { db } from "@/db";
import { events, subscriptions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  caktoEventHash,
  mapCaktoEventType,
  mapCaktoBillingInterval,
  mapCaktoPaymentMethod,
  mapCaktoSubscriptionStatus,
} from "@/utils/cakto-helpers";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { checkMilestones } from "@/utils/milestones";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { createNotification } from "@/utils/create-notification";
import type { BillingInterval } from "@/utils/billing";

export interface CaktoWebhookBody {
  event?: string;
  id?: string | number;
  status?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  customer?: { name?: string; email?: string; document?: string; phone?: string } | null;
  product?: { id?: string; name?: string } | null;
  subscription?: { id?: string; status?: string; interval?: string } | null;
  created_at?: string;
  approved_at?: string;
}

function pickCustomerId(body: CaktoWebhookBody): string {
  if (body.customer?.email) return body.customer.email.toLowerCase();
  if (body.customer?.document) return body.customer.document;
  return String(body.id ?? "unknown");
}

function pickGrossInCents(body: CaktoWebhookBody): number {
  return Math.round((body.amount ?? 0) * 100);
}

function pickEventDate(body: CaktoWebhookBody): Date {
  if (body.approved_at) return new Date(body.approved_at);
  if (body.created_at) return new Date(body.created_at);
  return new Date();
}

async function getOrgCurrency(orgId: string): Promise<string> {
  const [org] = await db
    .select({ currency: organizations.currency })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org?.currency ?? "BRL";
}

async function computeBaseValue(
  orgId: string,
  orgCurrency: string,
  grossValueInCents: number,
): Promise<{ baseCurrency: string; exchangeRate: number; baseGrossValueInCents: number }> {
  const rate = await resolveExchangeRate(orgId, "BRL", orgCurrency);
  const resolvedRate = rate ?? 1;
  return {
    baseCurrency: orgCurrency,
    exchangeRate: resolvedRate,
    baseGrossValueInCents: Math.round(grossValueInCents * resolvedRate),
  };
}

export async function handleCaktoEvent(orgId: string, body: CaktoWebhookBody): Promise<void> {
  const eventName = (body.event ?? "").toLowerCase();
  let shouldCheckMilestones = false;

  if (eventName === "purchase_approved") {
    await handleCaktoPurchase(orgId, body);
    shouldCheckMilestones = true;
  } else if (eventName === "refund" || eventName === "chargeback") {
    await handleCaktoRefund(orgId, body);
  } else if (eventName === "subscription_created") {
    await handleCaktoSubscriptionCreated(orgId, body);
  } else if (eventName === "subscription_canceled") {
    await handleCaktoSubscriptionCanceled(orgId, body);
  } else if (eventName === "subscription_renewed") {
    await handleCaktoRenewal(orgId, body);
    shouldCheckMilestones = true;
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => console.error("[milestone-check]", err));
  }
}

async function handleCaktoPurchase(orgId: string, body: CaktoWebhookBody): Promise<void> {
  const transactionId = String(body.id ?? "");
  if (!transactionId) return;
  const grossValueInCents = pickGrossInCents(body);
  if (!grossValueInCents) return;

  const customerId = pickCustomerId(body);
  const acq = await lookupAcquisitionContext(orgId, customerId, {
    email: body.customer?.email ?? null,
  });
  const recurring = !!body.subscription;

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );

  const billingInterval: BillingInterval | null = recurring
    ? mapCaktoBillingInterval(body.subscription?.interval ?? null)
    : null;

  const billingReason = recurring ? "subscription_cycle" : null;
  const eventType = "purchase";
  const paymentMethod = mapCaktoPaymentMethod(body.payment_method ?? null);
  const paidAt = pickEventDate(body);
  const eventHash = caktoEventHash(orgId, transactionId);

  const sharedCols = {
    organizationId: orgId,
    eventType,
    grossValueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    baseNetValueInCents: baseGrossValueInCents,
    billingType: recurring ? ("recurring" as const) : ("one_time" as const),
    billingReason,
    billingInterval,
    subscriptionId: body.subscription?.id ?? null,
    customerId,
    paymentMethod,
    provider: "cakto",
    eventHash,
    createdAt: paidAt,
    productId: body.product?.id ?? null,
    productName: body.product?.name ?? null,
    source: acq?.source ?? null,
    medium: acq?.medium ?? null,
    campaign: acq?.campaign ?? null,
    content: acq?.content ?? null,
    landingPage: acq?.landingPage ?? null,
    entryPage: acq?.entryPage ?? null,
    sessionId: acq?.sessionId ?? null,
  };

  await db
    .insert(events)
    .values(sharedCols)
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        eventType,
        billingType: recurring ? "recurring" : "one_time",
        billingReason,
        billingInterval,
        subscriptionId: body.subscription?.id ?? null,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        baseNetValueInCents: baseGrossValueInCents,
        createdAt: paidAt,
      },
    });

  await insertPayment(sharedCols).catch((err) => {
    console.error("[cakto-webhook] insertPayment failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (recurring && body.subscription?.id) {
    await db
      .insert(subscriptions)
      .values({
        organizationId: orgId,
        subscriptionId: body.subscription.id,
        customerId,
        planId: body.product?.id ?? body.subscription.id,
        planName: body.product?.name ?? body.subscription.id,
        status: "active",
        valueInCents: grossValueInCents,
        currency: "BRL",
        baseCurrency,
        exchangeRate,
        baseValueInCents: baseGrossValueInCents,
        billingInterval: billingInterval ?? "monthly",
        startedAt: paidAt,
      })
      .onConflictDoUpdate({
        target: [subscriptions.subscriptionId],
        set: {
          status: "active",
          baseCurrency,
          exchangeRate,
          baseValueInCents: baseGrossValueInCents,
          updatedAt: new Date(),
        },
      });
  }

  if (body.customer) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: body.customer.name ?? null,
      email: body.customer.email ?? null,
      phone: body.customer.phone ?? null,
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[cakto-webhook] upsertCustomer failed", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  const valueLabel = grossValueInCents
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(grossValueInCents / 100)
    : null;
  createNotification({
    organizationId: orgId,
    type: recurring ? "renewal" : "purchase",
    title: "Cliente",
    body: valueLabel ?? undefined,
    metadata: {
      customerId,
      customerName: body.customer?.name ?? null,
      valueInCents: grossValueInCents,
      currency: "BRL",
    },
  }).catch(() => {});
}

async function handleCaktoRefund(orgId: string, body: CaktoWebhookBody): Promise<void> {
  const transactionId = String(body.id ?? "");
  if (!transactionId) return;
  const grossValueInCents = pickGrossInCents(body);
  if (!grossValueInCents) return;

  const customerId = pickCustomerId(body);
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );
  const eventHash = caktoEventHash(orgId, `refund:${transactionId}`);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "refund",
      grossValueInCents: -grossValueInCents,
      currency: "BRL",
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents: -baseGrossValueInCents,
      billingType: "one_time",
      customerId,
      provider: "cakto",
      eventHash,
      metadata: { transactionId },
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        grossValueInCents: -grossValueInCents,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents: -baseGrossValueInCents,
      },
    });

  await insertPayment({
    organizationId: orgId,
    eventType: "refund",
    grossValueInCents: -grossValueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents: -baseGrossValueInCents,
    billingType: "one_time",
    customerId,
    provider: "cakto",
    eventHash,
    metadata: { transactionId },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[cakto-webhook] insertPayment refund failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function handleCaktoSubscriptionCreated(orgId: string, body: CaktoWebhookBody): Promise<void> {
  const subId = body.subscription?.id;
  if (!subId) return;

  const customerId = pickCustomerId(body);
  const grossValueInCents = pickGrossInCents(body);
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );
  const billingInterval: BillingInterval = mapCaktoBillingInterval(body.subscription?.interval ?? null);
  const paidAt = pickEventDate(body);

  await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      subscriptionId: subId,
      customerId,
      planId: body.product?.id ?? subId,
      planName: body.product?.name ?? subId,
      status: mapCaktoSubscriptionStatus(body.subscription?.status),
      valueInCents: grossValueInCents,
      currency: "BRL",
      baseCurrency,
      exchangeRate,
      baseValueInCents: baseGrossValueInCents,
      billingInterval,
      startedAt: paidAt,
    })
    .onConflictDoUpdate({
      target: [subscriptions.subscriptionId],
      set: {
        status: mapCaktoSubscriptionStatus(body.subscription?.status),
        baseCurrency,
        exchangeRate,
        baseValueInCents: baseGrossValueInCents,
        updatedAt: new Date(),
      },
    });
}

async function handleCaktoSubscriptionCanceled(orgId: string, body: CaktoWebhookBody): Promise<void> {
  const subId = body.subscription?.id;
  if (!subId) return;

  const customerId = pickCustomerId(body);
  const grossValueInCents = pickGrossInCents(body);
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );
  const billingInterval: BillingInterval = mapCaktoBillingInterval(body.subscription?.interval ?? null);
  const eventHash = caktoEventHash(orgId, `sub_canceled:${subId}`);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "subscription_canceled",
      grossValueInCents,
      currency: "BRL",
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: "recurring",
      billingInterval,
      subscriptionId: subId,
      customerId,
      provider: "cakto",
      eventHash,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await insertPayment({
    organizationId: orgId,
    eventType: "subscription_canceled",
    grossValueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: "recurring",
    billingInterval,
    subscriptionId: subId,
    customerId,
    provider: "cakto",
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[cakto-webhook] insertPayment cancel failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  await db
    .update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subId));
}

async function handleCaktoRenewal(orgId: string, body: CaktoWebhookBody): Promise<void> {
  const transactionId = String(body.id ?? "");
  if (!transactionId) return;
  const grossValueInCents = pickGrossInCents(body);
  if (!grossValueInCents) return;

  const customerId = pickCustomerId(body);
  const acq = await lookupAcquisitionContext(orgId, customerId, {
    email: body.customer?.email ?? null,
  });

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );

  const billingInterval: BillingInterval = mapCaktoBillingInterval(body.subscription?.interval ?? null);
  const paymentMethod = mapCaktoPaymentMethod(body.payment_method ?? null);
  const paidAt = pickEventDate(body);
  const eventHash = caktoEventHash(orgId, transactionId);

  const sharedCols = {
    organizationId: orgId,
    eventType: "renewal",
    grossValueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    baseNetValueInCents: baseGrossValueInCents,
    billingType: "recurring" as const,
    billingReason: "subscription_cycle",
    billingInterval,
    subscriptionId: body.subscription?.id ?? null,
    customerId,
    paymentMethod,
    provider: "cakto",
    eventHash,
    createdAt: paidAt,
    productId: body.product?.id ?? null,
    productName: body.product?.name ?? null,
    source: acq?.source ?? null,
    medium: acq?.medium ?? null,
    campaign: acq?.campaign ?? null,
    content: acq?.content ?? null,
    landingPage: acq?.landingPage ?? null,
    entryPage: acq?.entryPage ?? null,
    sessionId: acq?.sessionId ?? null,
  };

  await db
    .insert(events)
    .values(sharedCols)
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        eventType: "renewal",
        billingType: "recurring",
        billingReason: "subscription_cycle",
        billingInterval,
        subscriptionId: body.subscription?.id ?? null,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        baseNetValueInCents: baseGrossValueInCents,
        createdAt: paidAt,
      },
    });

  await insertPayment(sharedCols).catch((err) => {
    console.error("[cakto-webhook] insertPayment renewal failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (body.subscription?.id) {
    await db
      .insert(subscriptions)
      .values({
        organizationId: orgId,
        subscriptionId: body.subscription.id,
        customerId,
        planId: body.product?.id ?? body.subscription.id,
        planName: body.product?.name ?? body.subscription.id,
        status: "active",
        valueInCents: grossValueInCents,
        currency: "BRL",
        baseCurrency,
        exchangeRate,
        baseValueInCents: baseGrossValueInCents,
        billingInterval,
        startedAt: paidAt,
      })
      .onConflictDoUpdate({
        target: [subscriptions.subscriptionId],
        set: {
          status: "active",
          baseCurrency,
          exchangeRate,
          baseValueInCents: baseGrossValueInCents,
          updatedAt: new Date(),
        },
      });
  }

  if (body.customer) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: body.customer.name ?? null,
      email: body.customer.email ?? null,
      phone: body.customer.phone ?? null,
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[cakto-webhook] upsertCustomer failed", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  const valueLabel = grossValueInCents
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(grossValueInCents / 100)
    : null;
  createNotification({
    organizationId: orgId,
    type: "renewal",
    title: "Cliente",
    body: valueLabel ?? undefined,
    metadata: {
      customerId,
      customerName: body.customer?.name ?? null,
      valueInCents: grossValueInCents,
      currency: "BRL",
    },
  }).catch(() => {});
}
