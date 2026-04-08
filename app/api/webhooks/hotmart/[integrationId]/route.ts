import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations, events, subscriptions, organizations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import {
  hotmartEventHash,
  mapHotmartBillingInterval,
  mapHotmartPaymentMethod,
} from "@/utils/hotmart-helpers";
import { extractGrowthosCustomerId } from "@/utils/oauth-token-cache";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { checkMilestones } from "@/utils/milestones";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { createNotification } from "@/utils/create-notification";
import { isOrgOverRevenueLimit } from "@/utils/check-revenue-limit";
import { invalidateOrgDashboardCache } from "@/lib/cache";
import { getWebhookQueue } from "@/lib/queue";
import type { WebhookJobData } from "@/lib/queue";
import type { BillingInterval } from "@/utils/billing";

interface HotmartBuyerPayload {
  ucode?: string | null;
  name?: string | null;
  email?: string | null;
  document?: string | null;
  checkout_phone?: string | null;
}

interface HotmartProductPayload {
  id?: number | string | null;
  name?: string | null;
  ucode?: string | null;
}

interface HotmartPricePayload {
  value?: number | null;
  currency_value?: string | null;
}

interface HotmartPurchasePayload {
  transaction?: string | null;
  order_date?: number | null;
  approved_date?: number | null;
  status?: string | null;
  recurrence_number?: number | null;
  is_subscription?: boolean | null;
  payment?: { type?: string | null; method?: string | null } | null;
  price?: HotmartPricePayload | null;
  full_price?: HotmartPricePayload | null;
  offer?: { code?: string | null } | null;
  sck?: string | null;
}

interface HotmartSubscriberPayload {
  code?: string | null;
  email?: string | null;
}

interface HotmartPlanPayload {
  name?: string | null;
  recurrence_period?: string | null;
}

interface HotmartSubscriptionPayload {
  status?: string | null;
  plan?: HotmartPlanPayload | null;
  subscriber?: HotmartSubscriberPayload | null;
}

interface HotmartWebhookData {
  buyer?: HotmartBuyerPayload | null;
  product?: HotmartProductPayload | null;
  purchase?: HotmartPurchasePayload | null;
  subscription?: HotmartSubscriptionPayload | null;
}

interface HotmartWebhookBody {
  id?: string;
  creation_date?: number;
  event?: string;
  version?: string;
  hottok?: string;
  data?: HotmartWebhookData;
}

function pickCustomerId(data: HotmartWebhookData | undefined): string {
  if (!data) return "unknown";
  const fromSck = extractGrowthosCustomerId(data.purchase?.sck ?? null);
  if (fromSck) return fromSck;
  if (data.buyer?.ucode) return data.buyer.ucode;
  if (data.buyer?.email) return data.buyer.email.toLowerCase();
  if (data.buyer?.document) return data.buyer.document;
  return data.purchase?.transaction ?? "unknown";
}

function pickGrossInCents(data: HotmartWebhookData | undefined): number {
  const value = data?.purchase?.price?.value ?? data?.purchase?.full_price?.value;
  if (typeof value !== "number") return 0;
  return Math.round(value * 100);
}

function pickCurrency(data: HotmartWebhookData | undefined): string {
  return (data?.purchase?.price?.currency_value ?? "BRL").toUpperCase();
}

function pickEventDate(data: HotmartWebhookData | undefined): Date {
  const epoch = data?.purchase?.approved_date ?? data?.purchase?.order_date;
  if (typeof epoch === "number") return new Date(epoch);
  return new Date();
}

function isRecurring(data: HotmartWebhookData | undefined): boolean {
  if (!data) return false;
  if (data.purchase?.is_subscription === true) return true;
  if (data.subscription) return true;
  return false;
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
  eventCurrency: string,
  orgCurrency: string,
  grossValueInCents: number,
): Promise<{ baseCurrency: string; exchangeRate: number; baseGrossValueInCents: number }> {
  const rate = await resolveExchangeRate(orgId, eventCurrency, orgCurrency);
  const resolvedRate = rate ?? 1;
  return {
    baseCurrency: orgCurrency,
    exchangeRate: resolvedRate,
    baseGrossValueInCents: Math.round(grossValueInCents * resolvedRate),
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> },
) {
  const { integrationId } = await params;

  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (!integration || integration.status === "disconnected") {
    return new NextResponse("Unknown integration", { status: 400 });
  }

  if (!integration.providerMeta?.webhookSecret) {
    return new NextResponse("Hottok not configured", { status: 400 });
  }

  const rawBody = await req.text();
  let body: HotmartWebhookBody;
  try {
    body = JSON.parse(rawBody) as HotmartWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const expectedHottok = decrypt(integration.providerMeta.webhookSecret);
  const incomingHottok =
    body.hottok ??
    req.headers.get("x-hotmart-hottok") ??
    req.headers.get("hottok") ??
    null;

  if (!incomingHottok || incomingHottok !== expectedHottok) {
    return new NextResponse("Invalid hottok", { status: 401 });
  }

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[hotmart-webhook] revenue limit exceeded, skipping event", {
      orgId,
      event: body.event,
    });
    return new NextResponse(null, { status: 200 });
  }

  try {
    await handleHotmartEvent(orgId, body);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[hotmart-webhook] inline processing failed, enqueueing retry:", err);
    const jobData: WebhookJobData = {
      provider: "hotmart",
      integrationId,
      organizationId: orgId,
      payload: rawBody,
    };
    await getWebhookQueue()
      .add(`hotmart-retry-${body.id ?? Date.now()}`, jobData)
      .catch((qErr) => {
        console.error("[hotmart-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}

export async function handleHotmartEvent(
  orgId: string,
  body: HotmartWebhookBody,
): Promise<void> {
  const eventName = (body.event ?? "").toUpperCase();
  let shouldCheckMilestones = false;

  switch (eventName) {
    case "PURCHASE_APPROVED":
    case "PURCHASE_COMPLETE":
      await handleHotmartApproved(orgId, body);
      shouldCheckMilestones = true;
      break;
    case "PURCHASE_REFUNDED":
    case "PURCHASE_PROTEST":
      await handleHotmartRefund(orgId, body);
      break;
    case "PURCHASE_CHARGEBACK":
      await handleHotmartRefund(orgId, body);
      break;
    case "PURCHASE_CANCELED":
      await handleHotmartCanceled(orgId, body);
      break;
    case "PURCHASE_DELAYED":
    case "PURCHASE_EXPIRED":
      await handleHotmartPastDue(orgId, body);
      break;
    case "SUBSCRIPTION_CANCELLATION":
      await handleHotmartSubscriptionCanceled(orgId, body);
      break;
    case "UPDATE_SUBSCRIPTION_CHARGE_DATE":
      // No-op: subscription metadata change with no financial impact
      break;
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => console.error("[milestone-check]", err));
  }
}

async function handleHotmartApproved(orgId: string, body: HotmartWebhookBody): Promise<void> {
  const data = body.data;
  if (!data?.purchase?.transaction) return;
  const grossValueInCents = pickGrossInCents(data);
  if (!grossValueInCents) return;

  const customerId = pickCustomerId(data);
  const acq = await lookupAcquisitionContext(orgId, customerId);
  const recurring = isRecurring(data);
  const recurrenceNumber = data.purchase.recurrence_number ?? 0;

  const orgCurrency = await getOrgCurrency(orgId);
  const eventCurrency = pickCurrency(data);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );

  const billingInterval: BillingInterval | null = recurring
    ? mapHotmartBillingInterval(data.subscription?.plan?.recurrence_period ?? null)
    : null;
  const billingReason = recurring ? "subscription_cycle" : null;
  const eventType = recurring && recurrenceNumber > 1 ? "renewal" : "purchase";
  const paymentMethod = mapHotmartPaymentMethod(data.purchase.payment?.type ?? null);
  const paidAt = pickEventDate(data);
  const eventHash = hotmartEventHash(orgId, data.purchase.transaction);

  const sharedCols = {
    organizationId: orgId,
    eventType,
    grossValueInCents,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    baseNetValueInCents: baseGrossValueInCents,
    billingType: recurring ? ("recurring" as const) : ("one_time" as const),
    billingReason,
    billingInterval,
    subscriptionId: data.subscription?.subscriber?.code ?? null,
    customerId,
    paymentMethod,
    provider: "hotmart",
    eventHash,
    createdAt: paidAt,
    productId: data.product?.id ? String(data.product.id) : null,
    productName: data.product?.name ?? null,
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
        subscriptionId: data.subscription?.subscriber?.code ?? null,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        baseNetValueInCents: baseGrossValueInCents,
        createdAt: paidAt,
      },
    });

  await insertPayment(sharedCols).catch((err) => {
    console.error("[hotmart-webhook] insertPayment failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (recurring && data.subscription?.subscriber?.code) {
    await db
      .insert(subscriptions)
      .values({
        organizationId: orgId,
        subscriptionId: data.subscription.subscriber.code,
        customerId,
        planId: data.subscription.plan?.name ?? data.subscription.subscriber.code,
        planName:
          data.subscription.plan?.name ?? data.product?.name ?? data.subscription.subscriber.code,
        status: "active",
        valueInCents: grossValueInCents,
        currency: eventCurrency,
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

  if (data.buyer) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: data.buyer.name ?? null,
      email: data.buyer.email ?? null,
      phone: data.buyer.checkout_phone ?? null,
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[hotmart-webhook] upsertCustomer failed", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  const valueLabel = grossValueInCents
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: eventCurrency,
      }).format(grossValueInCents / 100)
    : null;
  createNotification({
    organizationId: orgId,
    type: recurring ? "renewal" : "purchase",
    title: "Cliente",
    body: valueLabel ?? undefined,
    metadata: {
      customerId,
      customerName: data.buyer?.name ?? null,
      valueInCents: grossValueInCents,
      currency: eventCurrency,
    },
  }).catch(() => {});
}

async function handleHotmartRefund(orgId: string, body: HotmartWebhookBody): Promise<void> {
  const data = body.data;
  if (!data?.purchase?.transaction) return;
  const grossValueInCents = pickGrossInCents(data);
  if (!grossValueInCents) return;

  const customerId = pickCustomerId(data);
  const orgCurrency = await getOrgCurrency(orgId);
  const eventCurrency = pickCurrency(data);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );
  const eventHash = hotmartEventHash(orgId, `refund:${data.purchase.transaction}`);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "refund",
      grossValueInCents: -grossValueInCents,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents: -baseGrossValueInCents,
      billingType: "one_time",
      customerId,
      provider: "hotmart",
      eventHash,
      metadata: { transaction: data.purchase.transaction },
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        grossValueInCents: -grossValueInCents,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents: -baseGrossValueInCents,
      },
    });

  await insertPayment({
    organizationId: orgId,
    eventType: "refund",
    grossValueInCents: -grossValueInCents,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents: -baseGrossValueInCents,
    billingType: "one_time",
    customerId,
    provider: "hotmart",
    eventHash,
    metadata: { transaction: data.purchase.transaction },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[hotmart-webhook] insertPayment refund failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function handleHotmartCanceled(orgId: string, body: HotmartWebhookBody): Promise<void> {
  // Treat as refund/reversal of the original transaction
  await handleHotmartRefund(orgId, body);
}

async function handleHotmartPastDue(orgId: string, body: HotmartWebhookBody): Promise<void> {
  const data = body.data;
  const subId = data?.subscription?.subscriber?.code;
  if (!subId) return;
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subId));
}

async function handleHotmartSubscriptionCanceled(
  orgId: string,
  body: HotmartWebhookBody,
): Promise<void> {
  const data = body.data;
  const subId = data?.subscription?.subscriber?.code;
  if (!subId) return;

  const customerId = pickCustomerId(data);
  const grossValueInCents = pickGrossInCents(data);
  const orgCurrency = await getOrgCurrency(orgId);
  const eventCurrency = pickCurrency(data);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );
  const billingInterval: BillingInterval = mapHotmartBillingInterval(
    data?.subscription?.plan?.recurrence_period ?? null,
  );
  const eventHash = hotmartEventHash(orgId, `sub_canceled:${subId}`);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "subscription_canceled",
      grossValueInCents,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: "recurring",
      billingInterval,
      subscriptionId: subId,
      customerId,
      provider: "hotmart",
      eventHash,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await insertPayment({
    organizationId: orgId,
    eventType: "subscription_canceled",
    grossValueInCents,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: "recurring",
    billingInterval,
    subscriptionId: subId,
    customerId,
    provider: "hotmart",
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[hotmart-webhook] insertPayment cancel failed", {
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
