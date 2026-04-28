import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";

export const dynamic = "force-dynamic";
import { integrations, events, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import { extractSubscriptionIdFromInvoice, extractPaymentIntentFromInvoice, mapBillingInterval, stripeEventHash } from "@/utils/stripe-helpers";
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

function extractMetaCustomerId(metadata: Record<string, string> | null | undefined): string | null {
  if (!metadata) return null;
  return metadata.growthos_customer_id ?? metadata.groware_customer_id ?? null;
}

async function resolveCustomerId(
  stripe: Stripe,
  objectMetadata: Record<string, string> | null | undefined,
  rawCustomerId: string | null,
  paymentIntentId?: string | null,
): Promise<string | null> {
  const fromObjectMeta = extractMetaCustomerId(objectMetadata);
  if (fromObjectMeta) return fromObjectMeta;

  if (paymentIntentId) {
    try {
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1,
      });
      if (sessions.data.length > 0) {
        const fromSession = extractMetaCustomerId(sessions.data[0].metadata);
        if (fromSession) return fromSession;
      }
    } catch {}
  }

  if (rawCustomerId?.startsWith("cus_")) {
    try {
      const customer = await stripe.customers.retrieve(rawCustomerId);
      if (customer && !customer.deleted) {
        const fromCustomer = extractMetaCustomerId(
          (customer as Stripe.Customer).metadata,
        );
        if (fromCustomer) return fromCustomer;
      }
    } catch {}
  }

  return rawCustomerId;
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
    return new NextResponse("Webhook secret not configured", { status: 400 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing signature", { status: 400 });

  const body = await req.text();
  const webhookSecret = decrypt(integration.providerMeta.webhookSecret);
  const stripe = new Stripe(decrypt(integration.accessToken));

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const orgId = integration.organizationId;

  const response = new NextResponse(null, { status: 200 });

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[stripe-webhook] revenue limit exceeded, skipping event", { orgId, eventType: event.type });
    return response;
  }

  try {
    await handleStripeEvent(orgId, event, stripe);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[stripe-webhook] inline processing failed, enqueueing retry:", event.type, err);
    const jobData: WebhookJobData = {
      provider: "stripe",
      integrationId,
      organizationId: orgId,
      payload: JSON.stringify(event),
    };
    await getWebhookQueue().add(`stripe-retry-${event.id}`, jobData).catch((qErr) => {
      console.error("[stripe-webhook] failed to enqueue retry:", qErr);
    });
  }

  return response;
}

export async function handleStripeEvent(orgId: string, event: Stripe.Event, stripe: Stripe) {
  let shouldCheckMilestones = false;

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(orgId, event.data.object as Stripe.Checkout.Session, event.created, stripe);
      shouldCheckMilestones = true;
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaid(orgId, event.data.object as Stripe.Invoice, event.created, stripe);
      shouldCheckMilestones = true;
      break;
    case "charge.refunded":
      await handleChargeRefunded(orgId, event.data.object as Stripe.Charge, stripe);
      break;
    case "customer.subscription.created":
      await handleSubscriptionCreated(orgId, event.data.object as Stripe.Subscription, event.id, stripe);
      shouldCheckMilestones = true;
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionCanceled(orgId, event.data.object as Stripe.Subscription, event.id, stripe);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(
        orgId,
        event.data.object as Stripe.Subscription,
        event.data.previous_attributes as Partial<Stripe.Subscription> | undefined,
        event.id,
        stripe,
      );
      shouldCheckMilestones = true;
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(orgId, event.data.object as Stripe.PaymentIntent, event.created, stripe);
      shouldCheckMilestones = true;
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(orgId, event.data.object as Stripe.Invoice);
      break;
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => {
      console.error("[milestone-check]", err);
    });
  }
}

async function handleCheckoutSessionCompleted(
  orgId: string,
  session: Stripe.Checkout.Session,
  eventTimestamp: number,
  stripe: Stripe,
) {
  if (session.mode !== "payment") return;
  if (session.payment_status !== "paid") return;
  if (!session.amount_total) return;

  const rawStripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const customerId = await resolveCustomerId(stripe, session.metadata, rawStripeCustomerId);
  if (!customerId) return;

  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  if (!piId) return;

  const acq = await lookupAcquisitionContext(orgId, customerId);
  const metaSessionId = session.metadata?.groware_session_id ?? null;

  const eventCurrency = session.currency?.toUpperCase() ?? "BRL";
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    session.amount_total,
  );

  const eventHash = stripeEventHash(orgId, piId);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "purchase",
      grossValueInCents: session.amount_total,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: "one_time",
      billingReason: null,
      billingInterval: null,
      subscriptionId: null,
      customerId,
      paymentMethod: "credit_card",
      provider: "stripe",
      eventHash,
      createdAt: new Date(eventTimestamp * 1000),
      source: acq?.source ?? null,
      medium: acq?.medium ?? null,
      campaign: acq?.campaign ?? null,
      content: acq?.content ?? null,
      landingPage: acq?.landingPage ?? null,
      entryPage: acq?.entryPage ?? null,
      sessionId: acq?.sessionId ?? metaSessionId,
    })
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        customerId,
        grossValueInCents: session.amount_total,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        source: acq?.source ?? null,
        medium: acq?.medium ?? null,
        campaign: acq?.campaign ?? null,
        content: acq?.content ?? null,
        landingPage: acq?.landingPage ?? null,
        entryPage: acq?.entryPage ?? null,
        sessionId: acq?.sessionId ?? metaSessionId,
        createdAt: new Date(eventTimestamp * 1000),
      },
    });

  await insertPayment({
    organizationId: orgId,
    eventType: "purchase",
    grossValueInCents: session.amount_total,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: "one_time",
    billingReason: null,
    billingInterval: null,
    subscriptionId: null,
    customerId,
    paymentMethod: "credit_card",
    provider: "stripe",
    eventHash,
    createdAt: new Date(eventTimestamp * 1000),
    source: acq?.source ?? null,
    medium: acq?.medium ?? null,
    campaign: acq?.campaign ?? null,
    content: acq?.content ?? null,
    landingPage: acq?.landingPage ?? null,
    entryPage: acq?.entryPage ?? null,
    sessionId: acq?.sessionId ?? metaSessionId,
  }).catch((err) => {
    console.error("[stripe-webhook] insertPayment failed", {
      orgId,
      eventType: "purchase",
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  upsertCustomer({
    organizationId: orgId,
    customerId,
    name: session.customer_details?.name ?? null,
    email: session.customer_details?.email ?? null,
    phone: session.customer_details?.phone ?? null,
    eventTimestamp: new Date(eventTimestamp * 1000),
  }).catch((err) => {
    console.error("[stripe-webhook] upsertCustomer failed (checkout.session.completed)", {
      orgId,
      customerId,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  const customerLabel = session.customer_details?.name ?? session.customer_details?.email ?? "Cliente";
  const valueLabel = session.amount_total
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: (session.currency ?? "brl").toUpperCase() }).format(session.amount_total / 100)
    : null;
  createNotification({
    organizationId: orgId,
    type: "purchase",
    title: customerLabel,
    body: valueLabel ?? undefined,
    metadata: { customerId, customerName: session.customer_details?.name ?? null, valueInCents: session.amount_total, currency: session.currency },
  }).catch(() => {});
}

async function handleInvoicePaid(orgId: string, invoice: Stripe.Invoice, eventTimestamp: number, stripe: Stripe) {
  const rawCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
  const customerId = await resolveCustomerId(
    stripe,
    invoice.metadata as Record<string, string> | null,
    rawCustomerId,
  );

  const subscriptionId = extractSubscriptionIdFromInvoice(invoice);
  const isRecurring = !!subscriptionId;
  const billingReason = invoice.billing_reason ?? null;
  const eventType = isRecurring && billingReason !== "subscription_create" ? "renewal" : "purchase";

  let billingInterval: string | null = null;
  if (subscriptionId) {
    const [sub] = await db
      .select({ billingInterval: subscriptions.billingInterval })
      .from(subscriptions)
      .where(eq(subscriptions.subscriptionId, subscriptionId))
      .limit(1);
    billingInterval = sub?.billingInterval ?? null;
  }

  const acq = await lookupAcquisitionContext(orgId, customerId ?? "");
  const eventCurrency = invoice.currency.toUpperCase();
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    invoice.amount_paid,
  );

  const piId = extractPaymentIntentFromInvoice(invoice);
  const eventHash = stripeEventHash(orgId, piId ?? invoice.id);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType,
      grossValueInCents: invoice.amount_paid,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: isRecurring ? "recurring" : "one_time",
      billingReason,
      billingInterval: billingInterval ?? null,
      subscriptionId,
      customerId: customerId ?? undefined,
      paymentMethod: "credit_card",
      provider: "stripe",
      eventHash,
      createdAt: new Date(eventTimestamp * 1000),
      source: acq?.source ?? null,
      medium: acq?.medium ?? null,
      campaign: acq?.campaign ?? null,
      content: acq?.content ?? null,
      landingPage: acq?.landingPage ?? null,
      entryPage: acq?.entryPage ?? null,
      sessionId: acq?.sessionId ?? null,
    })
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        eventType,
        billingType: isRecurring ? "recurring" : "one_time",
        billingReason,
        billingInterval: billingInterval ?? null,
        subscriptionId,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        createdAt: new Date(eventTimestamp * 1000),
      },
    });

  await insertPayment({
    organizationId: orgId,
    eventType,
    grossValueInCents: invoice.amount_paid,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: isRecurring ? "recurring" : "one_time",
    billingReason,
    billingInterval: billingInterval ?? null,
    subscriptionId,
    customerId: customerId ?? undefined,
    paymentMethod: "credit_card",
    provider: "stripe",
    eventHash,
    createdAt: new Date(eventTimestamp * 1000),
    source: acq?.source ?? null,
    medium: acq?.medium ?? null,
    campaign: acq?.campaign ?? null,
    content: acq?.content ?? null,
    landingPage: acq?.landingPage ?? null,
    entryPage: acq?.entryPage ?? null,
    sessionId: acq?.sessionId ?? null,
  }).catch((err) => {
    console.error("[stripe-webhook] insertPayment failed", {
      orgId,
      eventType,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (subscriptionId) {
    await db
      .update(subscriptions)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(subscriptions.subscriptionId, subscriptionId));
  }

  if (customerId) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: invoice.customer_name ?? null,
      email: invoice.customer_email ?? null,
      eventTimestamp: new Date(eventTimestamp * 1000),
    }).catch((err) => {
      console.error("[stripe-webhook] upsertCustomer failed (invoice.payment_succeeded)", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  const invoiceCustomerLabel = invoice.customer_name ?? invoice.customer_email ?? "Cliente";
  const invoiceValueLabel = invoice.amount_paid
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: eventCurrency }).format(invoice.amount_paid / 100)
    : null;
  createNotification({
    organizationId: orgId,
    type: eventType,
    title: invoiceCustomerLabel,
    body: invoiceValueLabel ?? undefined,
    metadata: { customerId, customerName: invoice.customer_name ?? null, valueInCents: invoice.amount_paid, currency: eventCurrency },
  }).catch(() => {});
}

async function handleChargeRefunded(orgId: string, charge: Stripe.Charge, stripe: Stripe) {
  const refundedAmount = charge.amount_refunded;
  if (!refundedAmount) return;

  const rawCustomerId =
    typeof charge.customer === "string" ? charge.customer : charge.customer?.id ?? null;
  const customerId = await resolveCustomerId(
    stripe,
    charge.metadata as Record<string, string> | null,
    rawCustomerId,
  );

  const eventCurrency = charge.currency.toUpperCase();
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    refundedAmount,
  );

  const eventHash = stripeEventHash(orgId, charge.id);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "refund",
      grossValueInCents: -refundedAmount,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents: -baseGrossValueInCents,
      billingType: "one_time",
      customerId: customerId ?? undefined,
      provider: "stripe",
      eventHash,
      metadata: { chargeId: charge.id, paymentIntent: charge.payment_intent },
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        grossValueInCents: -refundedAmount,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents: -baseGrossValueInCents,
      },
    });

  await insertPayment({
    organizationId: orgId,
    eventType: "refund",
    grossValueInCents: -refundedAmount,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents: -baseGrossValueInCents,
    billingType: "one_time",
    customerId: customerId ?? undefined,
    provider: "stripe",
    eventHash,
    metadata: { chargeId: charge.id, paymentIntent: charge.payment_intent },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[stripe-webhook] insertPayment failed", {
      orgId,
      eventType: "refund",
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (customerId) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: charge.billing_details?.name ?? null,
      email: charge.billing_details?.email ?? null,
      phone: charge.billing_details?.phone ?? null,
    }).catch((err) => {
      console.error("[stripe-webhook] upsertCustomer failed (charge.refunded)", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

async function resolveStripePlanName(
  stripe: Stripe,
  item: Stripe.SubscriptionItem | undefined,
): Promise<string> {
  const productRef = item?.price.product;
  let productName: string | null = null;
  if (typeof productRef === "string") {
    const product = await stripe.products.retrieve(productRef).catch(() => null);
    productName = product && !product.deleted ? product.name : null;
  } else if (typeof productRef === "object" && productRef !== null && !productRef.deleted) {
    productName = productRef.name;
  }
  return item?.price.nickname ?? productName ?? item?.price.id ?? "Plano";
}

async function handleSubscriptionCreated(
  orgId: string,
  sub: Stripe.Subscription,
  eventId: string,
  stripe: Stripe,
) {
  const rawCustomerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const customerId = await resolveCustomerId(
    stripe,
    sub.metadata as Record<string, string> | null,
    rawCustomerId,
  );

  const item = sub.items.data[0];
  const interval = item?.price.recurring?.interval ?? "month";
  const intervalCount = item?.price.recurring?.interval_count ?? 1;
  const billingInterval = mapBillingInterval(interval, intervalCount);

  const eventCurrency = sub.currency.toUpperCase();
  const orgCurrency = await getOrgCurrency(orgId);
  const valueInCents = item?.price.unit_amount ?? 0;
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    valueInCents,
  );

  const planName = await resolveStripePlanName(stripe, item);
  const resolvedCustomerId = customerId ?? rawCustomerId;

  await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      subscriptionId: sub.id,
      customerId: resolvedCustomerId,
      planId: item?.price.id ?? "unknown",
      planName,
      status: "active",
      valueInCents,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseValueInCents: baseGrossValueInCents,
      billingInterval,
      startedAt: new Date(sub.start_date * 1000),
    })
    .onConflictDoUpdate({
      target: [subscriptions.subscriptionId],
      set: {
        customerId: resolvedCustomerId,
        planName,
        status: "active",
        valueInCents,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseValueInCents: baseGrossValueInCents,
        updatedAt: new Date(),
      },
    });

  void eventId;
}

async function handleSubscriptionCanceled(
  orgId: string,
  sub: Stripe.Subscription,
  eventId: string,
  stripe: Stripe,
) {
  const rawCustomerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const customerId = await resolveCustomerId(
    stripe,
    sub.metadata as Record<string, string> | null,
    rawCustomerId,
  );

  const item = sub.items.data[0];
  const interval = item?.price.recurring?.interval ?? "month";
  const intervalCount = item?.price.recurring?.interval_count ?? 1;
  const billingInterval = mapBillingInterval(interval, intervalCount);

  const eventCurrency = sub.currency.toUpperCase();
  const orgCurrency = await getOrgCurrency(orgId);
  const valueInCents = item?.price.unit_amount ?? 0;
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    valueInCents,
  );

  const eventHash = stripeEventHash(orgId, eventId);
  const resolvedCustomerId = customerId ?? rawCustomerId;

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "subscription_canceled",
      grossValueInCents: valueInCents,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: "recurring",
      billingInterval,
      subscriptionId: sub.id,
      customerId: resolvedCustomerId,
      provider: "stripe",
      eventHash,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await insertPayment({
    organizationId: orgId,
    eventType: "subscription_canceled",
    grossValueInCents: valueInCents,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: "recurring",
    billingInterval,
    subscriptionId: sub.id,
    customerId: resolvedCustomerId,
    provider: "stripe",
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[stripe-webhook] insertPayment failed", {
      orgId,
      eventType: "subscription_canceled",
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  await db
    .update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, sub.id));
}

async function handleSubscriptionUpdated(
  orgId: string,
  sub: Stripe.Subscription,
  prev: Partial<Stripe.Subscription> | undefined,
  eventId: string,
  stripe: Stripe,
) {
  const prevItems = (prev?.items as Stripe.ApiList<Stripe.SubscriptionItem> | undefined)?.data;
  const prevAmount = prevItems?.[0]?.price?.unit_amount;
  const newAmount = sub.items.data[0]?.price.unit_amount;

  if (prevAmount == null || prevAmount === newAmount) return;

  const rawCustomerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const customerId = await resolveCustomerId(
    stripe,
    sub.metadata as Record<string, string> | null,
    rawCustomerId,
  );

  const eventCurrency = sub.currency.toUpperCase();
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    newAmount ?? 0,
  );

  const eventHash = stripeEventHash(orgId, eventId);
  const resolvedCustomerId = customerId ?? rawCustomerId;

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "subscription_changed",
      grossValueInCents: newAmount ?? 0,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: "recurring",
      subscriptionId: sub.id,
      customerId: resolvedCustomerId,
      provider: "stripe",
      metadata: { previousValue: prevAmount, newValue: newAmount ?? 0 },
      eventHash,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await insertPayment({
    organizationId: orgId,
    eventType: "subscription_changed",
    grossValueInCents: newAmount ?? 0,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: "recurring",
    subscriptionId: sub.id,
    customerId: resolvedCustomerId,
    provider: "stripe",
    metadata: { previousValue: prevAmount, newValue: newAmount ?? 0 },
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[stripe-webhook] insertPayment failed", {
      orgId,
      eventType: "subscription_changed",
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function handlePaymentIntentSucceeded(
  orgId: string,
  paymentIntent: Stripe.PaymentIntent,
  eventTimestamp: number,
  stripe: Stripe,
) {
  if (paymentIntent.amount <= 0) return;
  if (paymentIntent.status !== "succeeded") return;

  const rawStripeCustomerId =
    typeof paymentIntent.customer === "string"
      ? paymentIntent.customer
      : paymentIntent.customer?.id ?? null;
  const customerId = await resolveCustomerId(
    stripe,
    paymentIntent.metadata as Record<string, string> | null,
    rawStripeCustomerId,
    paymentIntent.id,
  );
  if (!customerId) return;

  const acq = await lookupAcquisitionContext(orgId, customerId);

  const eventCurrency = paymentIntent.currency.toUpperCase();
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    paymentIntent.amount,
  );

  const eventHash = stripeEventHash(orgId, paymentIntent.id);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "purchase",
      grossValueInCents: paymentIntent.amount,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: "one_time",
      billingReason: null,
      billingInterval: null,
      subscriptionId: null,
      customerId,
      paymentMethod: "credit_card",
      provider: "stripe",
      eventHash,
      createdAt: new Date(eventTimestamp * 1000),
      source: acq?.source ?? null,
      medium: acq?.medium ?? null,
      campaign: acq?.campaign ?? null,
      content: acq?.content ?? null,
      landingPage: acq?.landingPage ?? null,
      entryPage: acq?.entryPage ?? null,
      sessionId: acq?.sessionId ?? null,
    })
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        customerId,
        grossValueInCents: paymentIntent.amount,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        source: acq?.source ?? null,
        medium: acq?.medium ?? null,
        campaign: acq?.campaign ?? null,
        content: acq?.content ?? null,
        landingPage: acq?.landingPage ?? null,
        entryPage: acq?.entryPage ?? null,
        sessionId: acq?.sessionId ?? null,
        createdAt: new Date(eventTimestamp * 1000),
      },
    });

  await insertPayment({
    organizationId: orgId,
    eventType: "purchase",
    grossValueInCents: paymentIntent.amount,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: "one_time",
    billingReason: null,
    billingInterval: null,
    subscriptionId: null,
    customerId,
    paymentMethod: "credit_card",
    provider: "stripe",
    eventHash,
    createdAt: new Date(eventTimestamp * 1000),
    source: acq?.source ?? null,
    medium: acq?.medium ?? null,
    campaign: acq?.campaign ?? null,
    content: acq?.content ?? null,
    landingPage: acq?.landingPage ?? null,
    entryPage: acq?.entryPage ?? null,
    sessionId: acq?.sessionId ?? null,
  }).catch((err) => {
    console.error("[stripe-webhook] insertPayment failed", {
      orgId,
      eventType: "purchase",
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (rawStripeCustomerId?.startsWith("cus_")) {
    try {
      const customer = await stripe.customers.retrieve(rawStripeCustomerId);
      if (customer && !customer.deleted) {
        const stripeCustomer = customer as Stripe.Customer;
        upsertCustomer({
          organizationId: orgId,
          customerId,
          name: stripeCustomer.name ?? null,
          email: stripeCustomer.email ?? null,
          phone: stripeCustomer.phone ?? null,
          eventTimestamp: new Date(eventTimestamp * 1000),
        }).catch((err) => {
          console.error("[stripe-webhook] upsertCustomer failed (payment_intent.succeeded)", {
            orgId,
            customerId,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    } catch {}
  }

  const valueLabel = paymentIntent.amount
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: eventCurrency }).format(paymentIntent.amount / 100)
    : null;
  createNotification({
    organizationId: orgId,
    type: "purchase",
    title: "Venda avulsa",
    body: valueLabel ?? undefined,
    metadata: { customerId, valueInCents: paymentIntent.amount, currency: eventCurrency },
  }).catch(() => {});
}

async function handlePaymentFailed(orgId: string, invoice: Stripe.Invoice) {
  const subscriptionId = extractSubscriptionIdFromInvoice(invoice);

  if (!subscriptionId) return;

  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subscriptionId));
}
