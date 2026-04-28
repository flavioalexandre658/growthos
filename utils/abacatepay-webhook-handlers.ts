import { db } from "@/db";
import { events, subscriptions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  abacatepayEventHash,
  mapAbacatePayEventType,
  mapAbacatePayBillingInterval,
  mapAbacatePayPaymentMethod,
  mapAbacatePaySubscriptionStatus,
} from "@/utils/abacatepay-helpers";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { resolveInternalCustomerId } from "@/utils/resolve-internal-customer-id";
import { checkMilestones } from "@/utils/milestones";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { createNotification } from "@/utils/create-notification";
import type { BillingInterval } from "@/utils/billing";

export interface AbacatePayWebhookBody {
  id?: string;
  event?: string;
  apiVersion?: number;
  devMode?: boolean;
  data?: {
    id?: string;
    amount?: number;
    status?: string;
    method?: string;
    customer?: { id?: string; name?: string; email?: string; taxId?: string } | null;
    subscription?: { id?: string; status?: string; frequency?: string } | null;
    product?: { id?: string; name?: string } | null;
    createdAt?: string;
    paidAt?: string;
  } | null;
}

function pickCustomerId(body: AbacatePayWebhookBody): string {
  if (body.data?.customer?.email) return body.data.customer.email.toLowerCase();
  if (body.data?.customer?.id) return body.data.customer.id;
  if (body.data?.customer?.taxId) return body.data.customer.taxId;
  return body.data?.id ?? "unknown";
}

function pickGrossInCents(body: AbacatePayWebhookBody): number {
  return body.data?.amount ?? 0;
}

function pickEventDate(body: AbacatePayWebhookBody): Date {
  if (body.data?.paidAt) return new Date(body.data.paidAt);
  if (body.data?.createdAt) return new Date(body.data.createdAt);
  return new Date();
}

function isRecurring(body: AbacatePayWebhookBody): boolean {
  if (body.data?.subscription) return true;
  const evt = (body.event ?? "").toLowerCase();
  return evt.startsWith("subscription.");
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

export async function handleAbacatePayEvent(orgId: string, body: AbacatePayWebhookBody): Promise<void> {
  const eventName = (body.event ?? "").toLowerCase();
  const normalized = mapAbacatePayEventType(eventName);
  let shouldCheckMilestones = false;

  if (normalized === "paid") {
    const recurring = isRecurring(body);
    const isRenewal = recurring && eventName === "subscription.renewed";
    await handleAbacatePayPurchase(orgId, body, isRenewal);
    shouldCheckMilestones = true;
  } else if (normalized === "refunded") {
    await handleAbacatePayRefund(orgId, body);
  } else if (normalized === "past_due") {
    await handleAbacatePayPastDue(orgId, body);
  } else if (normalized === "subscription_canceled") {
    await handleAbacatePaySubscriptionCanceled(orgId, body);
  } else if (normalized === "renewal") {
    await handleAbacatePayPurchase(orgId, body, true);
    shouldCheckMilestones = true;
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => console.error("[milestone-check]", err));
  }
}

async function handleAbacatePayPurchase(orgId: string, body: AbacatePayWebhookBody, isRenewal: boolean): Promise<void> {
  const dataId = body.data?.id ?? "";
  if (!dataId) return;
  const grossValueInCents = pickGrossInCents(body);
  if (!grossValueInCents) return;

  const fallbackCustomerId = pickCustomerId(body);
  const customerEmail = body.data?.customer?.email?.toLowerCase() ?? null;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: customerEmail,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;
  const acq = await lookupAcquisitionContext(orgId, customerId, {
    email: body.data?.customer?.email ?? null,
  });
  const recurring = isRecurring(body);

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );

  const billingInterval: BillingInterval | null = recurring
    ? mapAbacatePayBillingInterval(body.data?.subscription?.frequency ?? null)
    : null;

  const billingReason = recurring ? "subscription_cycle" : null;
  const eventType = isRenewal ? "renewal" : "purchase";
  const paymentMethod = mapAbacatePayPaymentMethod(body.data?.method ?? null);
  const paidAt = pickEventDate(body);
  const eventHash = abacatepayEventHash(orgId, dataId);

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
    subscriptionId: body.data?.subscription?.id ?? null,
    customerId,
    paymentMethod,
    provider: "abacatepay",
    eventHash,
    createdAt: paidAt,
    productId: body.data?.product?.id ?? null,
    productName: body.data?.product?.name ?? null,
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
        subscriptionId: body.data?.subscription?.id ?? null,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        baseNetValueInCents: baseGrossValueInCents,
        createdAt: paidAt,
      },
    });

  await insertPayment(sharedCols).catch((err) => {
    console.error("[abacatepay-webhook] insertPayment failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (recurring && body.data?.subscription?.id) {
    await db
      .insert(subscriptions)
      .values({
        organizationId: orgId,
        subscriptionId: body.data.subscription.id,
        customerId,
        planId: body.data.product?.id ?? body.data.subscription.id,
        planName: body.data.product?.name ?? body.data.subscription.id,
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

  if (body.data?.customer) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: body.data.customer.name ?? null,
      email: body.data.customer.email ?? null,
      phone: null,
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[abacatepay-webhook] upsertCustomer failed", {
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
      customerName: body.data?.customer?.name ?? null,
      valueInCents: grossValueInCents,
      currency: "BRL",
    },
  }).catch(() => {});
}

async function handleAbacatePayRefund(orgId: string, body: AbacatePayWebhookBody): Promise<void> {
  const dataId = body.data?.id ?? "";
  if (!dataId) return;
  const grossValueInCents = pickGrossInCents(body);
  if (!grossValueInCents) return;

  const fallbackCustomerId = pickCustomerId(body);
  const customerEmail = body.data?.customer?.email?.toLowerCase() ?? null;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: customerEmail,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );
  const eventHash = abacatepayEventHash(orgId, `refund:${dataId}`);

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
      provider: "abacatepay",
      eventHash,
      metadata: { dataId },
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
    provider: "abacatepay",
    eventHash,
    metadata: { dataId },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[abacatepay-webhook] insertPayment refund failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function handleAbacatePayPastDue(orgId: string, body: AbacatePayWebhookBody): Promise<void> {
  const subId = body.data?.subscription?.id;
  if (!subId) return;
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subId));
}

async function handleAbacatePaySubscriptionCanceled(orgId: string, body: AbacatePayWebhookBody): Promise<void> {
  const subId = body.data?.subscription?.id;
  if (!subId) return;

  const fallbackCustomerId = pickCustomerId(body);
  const customerEmail = body.data?.customer?.email?.toLowerCase() ?? null;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: customerEmail,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;
  const grossValueInCents = pickGrossInCents(body);
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );
  const billingInterval: BillingInterval = mapAbacatePayBillingInterval(
    body.data?.subscription?.frequency ?? null,
  );
  const eventHash = abacatepayEventHash(orgId, `sub_canceled:${subId}`);

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
      provider: "abacatepay",
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
    provider: "abacatepay",
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[abacatepay-webhook] insertPayment cancel failed", {
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
