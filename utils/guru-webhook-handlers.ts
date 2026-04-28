import { db } from "@/db";
import { events, subscriptions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  guruEventHash,
  mapGuruTransactionStatus,
  mapGuruSubscriptionStatus,
  mapGuruBillingInterval,
  mapGuruPaymentMethod,
} from "@/utils/guru-helpers";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { checkMilestones } from "@/utils/milestones";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { createNotification } from "@/utils/create-notification";
import type { BillingInterval } from "@/utils/billing";

export interface GuruContact {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  doc?: string | null;
  phone_number?: string | null;
}

export interface GuruProduct {
  id?: string | null;
  name?: string | null;
  type?: string | null;
  unit_value?: number | null;
  total_value?: number | null;
}

export interface GuruPayment {
  gross?: number | null;
  total?: number | null;
  net?: number | null;
  discount_value?: number | null;
  affiliate_value?: number | null;
  method?: string | null;
  installments?: number | null;
}

export interface GuruSubscription {
  id?: string | null;
  name?: string | null;
  last_status?: string | null;
  charged_every_days?: number | null;
  charged_times?: number | null;
  trial_days?: number | null;
  cancel_reason?: string | null;
  cancelled_by?: string | null;
}

export interface GuruWebhookBody {
  api_token?: string;
  id?: string | number;
  webhook_type?: string;
  status?: string;
  type?: string;
  dates?: { created_at?: string; updated_at?: string; confirmed_at?: string } | null;
  contact?: GuruContact | null;
  product?: GuruProduct | null;
  payment?: GuruPayment | null;
  subscription?: GuruSubscription | null;
}

function pickCustomerId(body: GuruWebhookBody): string {
  if (body.contact?.email) return body.contact.email.toLowerCase();
  if (body.contact?.id) return body.contact.id;
  if (body.contact?.doc) return body.contact.doc;
  return String(body.id ?? "unknown");
}

function pickGrossInCents(body: GuruWebhookBody): number {
  const gross = body.payment?.gross ?? body.payment?.total ?? body.product?.total_value ?? 0;
  return Math.round(gross * 100);
}

function isRecurring(body: GuruWebhookBody): boolean {
  if (body.subscription) return true;
  if (body.product?.type === "plan") return true;
  return false;
}

function pickEventDate(body: GuruWebhookBody): Date {
  if (body.dates?.confirmed_at) return new Date(body.dates.confirmed_at);
  if (body.dates?.created_at) return new Date(body.dates.created_at);
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

export async function handleGuruEvent(orgId: string, body: GuruWebhookBody): Promise<void> {
  const status = (body.status ?? "").toLowerCase();
  const normalized = mapGuruTransactionStatus(status);
  let shouldCheckMilestones = false;

  if (normalized === "paid") {
    await handleGuruPurchase(orgId, body);
    shouldCheckMilestones = true;
  } else if (normalized === "refunded") {
    await handleGuruRefund(orgId, body);
  } else if (status === "canceled" || status === "cancelada") {
    if (body.subscription) {
      await handleGuruSubscriptionCanceled(orgId, body);
    }
  } else if (normalized === "past_due" && body.subscription) {
    await handleGuruSubscriptionPastDue(orgId, body);
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => console.error("[milestone-check]", err));
  }
}

async function handleGuruPurchase(orgId: string, body: GuruWebhookBody): Promise<void> {
  const transactionId = String(body.id ?? "");
  if (!transactionId) return;
  const grossValueInCents = pickGrossInCents(body);
  if (!grossValueInCents) return;

  const customerId = pickCustomerId(body);
  const acq = await lookupAcquisitionContext(orgId, customerId, {
    email: body.contact?.email ?? null,
  });
  const recurring = isRecurring(body);

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );

  const netInCents = body.payment?.net ? Math.round(body.payment.net * 100) : grossValueInCents;
  const billingInterval: BillingInterval | null = recurring
    ? mapGuruBillingInterval(body.subscription?.charged_every_days ?? null)
    : null;

  const isRenewal = recurring && (body.subscription?.charged_times ?? 0) > 1;
  const billingReason = recurring ? "subscription_cycle" : null;
  const eventType = isRenewal ? "renewal" : "purchase";
  const paymentMethod = mapGuruPaymentMethod(body.payment?.method ?? null);
  const paidAt = pickEventDate(body);
  const eventHash = guruEventHash(orgId, transactionId);

  const sharedCols = {
    organizationId: orgId,
    eventType,
    grossValueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    baseNetValueInCents: Math.round(netInCents * exchangeRate),
    billingType: recurring ? ("recurring" as const) : ("one_time" as const),
    billingReason,
    billingInterval,
    subscriptionId: body.subscription?.id ?? null,
    customerId,
    paymentMethod,
    provider: "guru",
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
        baseNetValueInCents: Math.round(netInCents * exchangeRate),
        createdAt: paidAt,
      },
    });

  await insertPayment(sharedCols).catch((err) => {
    console.error("[guru-webhook] insertPayment failed", {
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
        planName: body.subscription.name ?? body.product?.name ?? body.subscription.id,
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

  if (body.contact) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: body.contact.name ?? null,
      email: body.contact.email ?? null,
      phone: body.contact.phone_number ?? null,
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[guru-webhook] upsertCustomer failed", {
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
      customerName: body.contact?.name ?? null,
      valueInCents: grossValueInCents,
      currency: "BRL",
    },
  }).catch(() => {});
}

async function handleGuruRefund(orgId: string, body: GuruWebhookBody): Promise<void> {
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
  const eventHash = guruEventHash(orgId, `refund:${transactionId}`);

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
      provider: "guru",
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
    provider: "guru",
    eventHash,
    metadata: { transactionId },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[guru-webhook] insertPayment refund failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function handleGuruSubscriptionCanceled(orgId: string, body: GuruWebhookBody): Promise<void> {
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
  const billingInterval: BillingInterval = mapGuruBillingInterval(
    body.subscription?.charged_every_days ?? null,
  );
  const eventHash = guruEventHash(orgId, `sub_canceled:${subId}`);

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
      provider: "guru",
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
    provider: "guru",
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[guru-webhook] insertPayment cancel failed", {
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

async function handleGuruSubscriptionPastDue(orgId: string, body: GuruWebhookBody): Promise<void> {
  const subId = body.subscription?.id;
  if (!subId) return;
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subId));
}
