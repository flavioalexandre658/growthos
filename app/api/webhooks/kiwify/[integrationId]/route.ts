import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations, events, subscriptions, organizations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import {
  kiwifyEventHash,
  mapKiwifyBillingInterval,
  mapKiwifyPaymentMethod,
} from "@/utils/kiwify-helpers";
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

interface KiwifyCustomerPayload {
  full_name?: string | null;
  first_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  CPF?: string | null;
}

interface KiwifyProductPayload {
  product_id?: string | null;
  product_name?: string | null;
  is_subscription?: boolean | null;
}

interface KiwifyTrackingPayload {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
}

interface KiwifySubscriptionPayload {
  id?: string | null;
  status?: string | null;
  plan?: { id?: string | null; name?: string | null; frequency?: string | null } | null;
  frequency?: string | null;
  start_date?: string | null;
}

interface KiwifyCommissionsPayload {
  charge_amount?: number | null;
  net_amount?: number | null;
  currency?: string | null;
}

interface KiwifyWebhookBody {
  webhook_event_type?: string;
  event?: string;
  order_id?: string;
  order_status?: string | null;
  payment_method?: string | null;
  charge_amount?: number | null;
  product_price?: number | null;
  net_amount?: number | null;
  currency?: string | null;
  created_at?: string | null;
  approved_at?: string | null;
  Customer?: KiwifyCustomerPayload;
  customer?: KiwifyCustomerPayload;
  Product?: KiwifyProductPayload;
  product?: KiwifyProductPayload;
  TrackingParameters?: KiwifyTrackingPayload;
  tracking_parameters?: KiwifyTrackingPayload;
  Subscription?: KiwifySubscriptionPayload;
  subscription?: KiwifySubscriptionPayload;
  Commissions?: KiwifyCommissionsPayload;
  commissions?: KiwifyCommissionsPayload;
}

function extractEventType(body: KiwifyWebhookBody): string {
  return (body.webhook_event_type ?? body.event ?? "").toString();
}

function pickCustomer(body: KiwifyWebhookBody): KiwifyCustomerPayload | null {
  return body.Customer ?? body.customer ?? null;
}

function pickProduct(body: KiwifyWebhookBody): KiwifyProductPayload | null {
  return body.Product ?? body.product ?? null;
}

function pickTracking(body: KiwifyWebhookBody): KiwifyTrackingPayload | null {
  return body.TrackingParameters ?? body.tracking_parameters ?? null;
}

function pickSubscriptionInfo(body: KiwifyWebhookBody): KiwifySubscriptionPayload | null {
  return body.Subscription ?? body.subscription ?? null;
}

function pickCommissions(body: KiwifyWebhookBody): KiwifyCommissionsPayload | null {
  return body.Commissions ?? body.commissions ?? null;
}

function pickCustomerId(body: KiwifyWebhookBody): string {
  const fromTracking = extractGrowthosCustomerId(pickTracking(body)?.utm_content ?? null);
  if (fromTracking) return fromTracking;
  const customer = pickCustomer(body);
  if (customer?.email) return customer.email.toLowerCase();
  if (customer?.CPF) return customer.CPF;
  return body.order_id ?? "unknown";
}

function pickGrossInCents(body: KiwifyWebhookBody): number {
  const commissions = pickCommissions(body);
  const charge = body.charge_amount ?? commissions?.charge_amount;
  if (typeof charge === "number") return Math.round(charge);
  if (typeof body.product_price === "number") return Math.round(body.product_price);
  return 0;
}

function pickNetInCents(body: KiwifyWebhookBody): number {
  const commissions = pickCommissions(body);
  const net = body.net_amount ?? commissions?.net_amount;
  if (typeof net === "number") return Math.round(net);
  return pickGrossInCents(body);
}

function pickCurrency(body: KiwifyWebhookBody): string {
  return (body.currency ?? pickCommissions(body)?.currency ?? "BRL").toUpperCase();
}

function pickEventDate(body: KiwifyWebhookBody): Date {
  if (body.approved_at) return new Date(body.approved_at);
  if (body.created_at) return new Date(body.created_at);
  return new Date();
}

function isRecurring(body: KiwifyWebhookBody): boolean {
  if (pickSubscriptionInfo(body)) return true;
  const product = pickProduct(body);
  return product?.is_subscription === true;
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

function extractKiwifyToken(req: NextRequest, body: KiwifyWebhookBody | null): string | null {
  // Token may be delivered as query param ?token=..., header x-kiwify-token, or in body.
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken) return queryToken;
  const headerToken =
    req.headers.get("x-kiwify-token") ??
    req.headers.get("kiwify-token") ??
    req.headers.get("x-kiwify-signature");
  if (headerToken) return headerToken;
  if (body && typeof (body as Record<string, unknown>).token === "string") {
    return (body as Record<string, unknown>).token as string;
  }
  return null;
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
    return new NextResponse("Webhook token not configured", { status: 400 });
  }

  const rawBody = await req.text();
  let body: KiwifyWebhookBody;
  try {
    body = JSON.parse(rawBody) as KiwifyWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const token = extractKiwifyToken(req, body);
  const expectedToken = decrypt(integration.providerMeta.webhookSecret);
  if (!token || token !== expectedToken) {
    return new NextResponse("Invalid token", { status: 401 });
  }

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[kiwify-webhook] revenue limit exceeded, skipping event", {
      orgId,
      event: extractEventType(body),
    });
    return new NextResponse(null, { status: 200 });
  }

  try {
    await handleKiwifyEvent(orgId, body);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[kiwify-webhook] inline processing failed, enqueueing retry:", err);
    const jobData: WebhookJobData = {
      provider: "kiwify",
      integrationId,
      organizationId: orgId,
      payload: rawBody,
    };
    await getWebhookQueue()
      .add(`kiwify-retry-${body.order_id ?? Date.now()}`, jobData)
      .catch((qErr) => {
        console.error("[kiwify-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}

export async function handleKiwifyEvent(orgId: string, body: KiwifyWebhookBody): Promise<void> {
  const eventType = extractEventType(body).toLowerCase();
  let shouldCheckMilestones = false;

  switch (eventType) {
    case "compra_aprovada":
    case "order_approved":
      await handleKiwifyPurchase(orgId, body);
      shouldCheckMilestones = true;
      break;
    case "subscription_renewed":
      await handleKiwifyPurchase(orgId, body, true);
      shouldCheckMilestones = true;
      break;
    case "compra_reembolsada":
    case "order_refunded":
      await handleKiwifyRefund(orgId, body);
      break;
    case "chargeback":
      await handleKiwifyRefund(orgId, body);
      break;
    case "subscription_canceled":
      await handleKiwifySubscriptionCanceled(orgId, body);
      break;
    case "subscription_late":
      await handleKiwifySubscriptionPastDue(orgId, body);
      break;
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => console.error("[milestone-check]", err));
  }
}

async function handleKiwifyPurchase(
  orgId: string,
  body: KiwifyWebhookBody,
  forceRecurring = false,
): Promise<void> {
  if (!body.order_id) return;
  const grossValueInCents = pickGrossInCents(body);
  if (!grossValueInCents) return;

  const customerId = pickCustomerId(body);
  const acq = await lookupAcquisitionContext(orgId, customerId);
  const recurring = forceRecurring || isRecurring(body);

  const orgCurrency = await getOrgCurrency(orgId);
  const eventCurrency = pickCurrency(body);
  const netValueInCents = pickNetInCents(body);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );

  const subInfo = pickSubscriptionInfo(body);
  const product = pickProduct(body);
  const billingInterval: BillingInterval | null = recurring
    ? mapKiwifyBillingInterval(subInfo?.frequency ?? subInfo?.plan?.frequency ?? null)
    : null;

  const billingReason = recurring ? "subscription_cycle" : null;
  const eventType = forceRecurring ? "renewal" : "purchase";
  const paymentMethod = mapKiwifyPaymentMethod(body.payment_method);
  const paidAt = pickEventDate(body);
  const eventHash = kiwifyEventHash(orgId, body.order_id);

  const sharedCols = {
    organizationId: orgId,
    eventType,
    grossValueInCents,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    baseNetValueInCents: Math.round(netValueInCents * exchangeRate),
    billingType: recurring ? ("recurring" as const) : ("one_time" as const),
    billingReason,
    billingInterval,
    subscriptionId: subInfo?.id ?? null,
    customerId,
    paymentMethod,
    provider: "kiwify",
    eventHash,
    createdAt: paidAt,
    productId: product?.product_id ?? null,
    productName: product?.product_name ?? null,
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
        subscriptionId: subInfo?.id ?? null,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        baseNetValueInCents: Math.round(netValueInCents * exchangeRate),
        createdAt: paidAt,
      },
    });

  await insertPayment(sharedCols).catch((err) => {
    console.error("[kiwify-webhook] insertPayment failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (recurring && subInfo?.id) {
    await db
      .insert(subscriptions)
      .values({
        organizationId: orgId,
        subscriptionId: subInfo.id,
        customerId,
        planId: subInfo.plan?.id ?? subInfo.id,
        planName: subInfo.plan?.name ?? product?.product_name ?? subInfo.id,
        status: "active",
        valueInCents: grossValueInCents,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseValueInCents: baseGrossValueInCents,
        billingInterval: billingInterval ?? "monthly",
        startedAt: subInfo.start_date ? new Date(subInfo.start_date) : paidAt,
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

  const customer = pickCustomer(body);
  if (customer) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: customer.full_name ?? customer.first_name ?? null,
      email: customer.email ?? null,
      phone: customer.mobile ?? null,
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[kiwify-webhook] upsertCustomer failed", {
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
      customerName: customer?.full_name ?? null,
      valueInCents: grossValueInCents,
      currency: eventCurrency,
    },
  }).catch(() => {});
}

async function handleKiwifyRefund(orgId: string, body: KiwifyWebhookBody): Promise<void> {
  if (!body.order_id) return;
  const grossValueInCents = pickGrossInCents(body);
  if (!grossValueInCents) return;

  const customerId = pickCustomerId(body);
  const orgCurrency = await getOrgCurrency(orgId);
  const eventCurrency = pickCurrency(body);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );
  const eventHash = kiwifyEventHash(orgId, `refund:${body.order_id}`);

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
      provider: "kiwify",
      eventHash,
      metadata: { orderId: body.order_id },
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
    provider: "kiwify",
    eventHash,
    metadata: { orderId: body.order_id },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[kiwify-webhook] insertPayment refund failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function handleKiwifySubscriptionCanceled(
  orgId: string,
  body: KiwifyWebhookBody,
): Promise<void> {
  const subInfo = pickSubscriptionInfo(body);
  if (!subInfo?.id) return;

  const customerId = pickCustomerId(body);
  const grossValueInCents = pickGrossInCents(body);
  const orgCurrency = await getOrgCurrency(orgId);
  const eventCurrency = pickCurrency(body);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );
  const billingInterval: BillingInterval = mapKiwifyBillingInterval(
    subInfo.frequency ?? subInfo.plan?.frequency ?? null,
  );
  const eventHash = kiwifyEventHash(orgId, `sub_canceled:${subInfo.id}`);

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
      subscriptionId: subInfo.id,
      customerId,
      provider: "kiwify",
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
    subscriptionId: subInfo.id,
    customerId,
    provider: "kiwify",
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[kiwify-webhook] insertPayment cancel failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  await db
    .update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subInfo.id));
}

async function handleKiwifySubscriptionPastDue(
  orgId: string,
  body: KiwifyWebhookBody,
): Promise<void> {
  const subInfo = pickSubscriptionInfo(body);
  if (!subInfo?.id) return;
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subInfo.id));
}
