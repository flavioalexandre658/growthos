import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { integrations, events, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { hashAnonymous } from "@/lib/hash";
import { eq } from "drizzle-orm";
import { extractSubscriptionIdFromInvoice, mapBillingInterval, stripeEventHash } from "@/utils/stripe-helpers";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { checkMilestones } from "@/utils/milestones";

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

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(decrypt(integration.accessToken));
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const orgId = integration.organizationId;

  const response = new NextResponse(null, { status: 200 });

  await handleStripeEvent(orgId, event).catch((err) => {
    console.error("[stripe-webhook]", event.type, err);
  });

  return response;
}

async function handleStripeEvent(orgId: string, event: Stripe.Event) {
  let shouldCheckMilestones = false;

  switch (event.type) {
    case "invoice.payment_succeeded":
      await handleInvoicePaid(orgId, event.data.object as Stripe.Invoice, event.created);
      shouldCheckMilestones = true;
      break;
    case "charge.refunded":
      await handleChargeRefunded(orgId, event.data.object as Stripe.Charge);
      break;
    case "customer.subscription.created":
      await handleSubscriptionCreated(orgId, event.data.object as Stripe.Subscription, event.id);
      shouldCheckMilestones = true;
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionCanceled(orgId, event.data.object as Stripe.Subscription, event.id);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(
        orgId,
        event.data.object as Stripe.Subscription,
        event.data.previous_attributes as Partial<Stripe.Subscription> | undefined,
        event.id,
      );
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

async function handleInvoicePaid(orgId: string, invoice: Stripe.Invoice, eventTimestamp: number) {
  const rawCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
  const hashedCustomerId = hashAnonymous(rawCustomerId);

  const subscriptionId = extractSubscriptionIdFromInvoice(invoice);
  const isRecurring = !!subscriptionId;
  const billingReason = invoice.billing_reason ?? null;
  const eventType = isRecurring && billingReason === "subscription_cycle" ? "renewal" : "purchase";

  let billingInterval: string | null = null;
  if (subscriptionId) {
    const [sub] = await db
      .select({ billingInterval: subscriptions.billingInterval })
      .from(subscriptions)
      .where(eq(subscriptions.subscriptionId, subscriptionId))
      .limit(1);
    billingInterval = sub?.billingInterval ?? null;
  }

  const acq = await lookupAcquisitionContext(orgId, hashedCustomerId);
  const eventCurrency = invoice.currency.toUpperCase();
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    invoice.amount_paid,
  );

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
      customerId: hashedCustomerId,
      paymentMethod: "credit_card",
      provider: "stripe",
      eventHash: stripeEventHash(orgId, invoice.id),
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

  if (subscriptionId) {
    await db
      .update(subscriptions)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(subscriptions.subscriptionId, subscriptionId));
  }
}

async function handleChargeRefunded(orgId: string, charge: Stripe.Charge) {
  const refundedAmount = charge.amount_refunded;
  if (!refundedAmount) return;

  const rawCustomerId =
    typeof charge.customer === "string" ? charge.customer : charge.customer?.id ?? null;
  const hashedCustomerId = rawCustomerId ? hashAnonymous(rawCustomerId) : null;

  const eventCurrency = charge.currency.toUpperCase();
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    refundedAmount,
  );

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
      customerId: hashedCustomerId ?? undefined,
      provider: "stripe",
      eventHash: stripeEventHash(orgId, charge.id),
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
}

async function handleSubscriptionCreated(
  orgId: string,
  sub: Stripe.Subscription,
  eventId: string,
) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
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

  await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      subscriptionId: sub.id,
      customerId: hashAnonymous(customerId),
      planId: item?.price.id ?? "unknown",
      planName: item?.price.nickname ?? item?.price.id ?? "Plano",
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
        status: "active",
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
) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
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
      customerId: hashAnonymous(customerId),
      provider: "stripe",
      eventHash: stripeEventHash(orgId, eventId),
      createdAt: new Date(),
    })
    .onConflictDoNothing();

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
) {
  const prevItems = (prev?.items as Stripe.ApiList<Stripe.SubscriptionItem> | undefined)?.data;
  const prevAmount = prevItems?.[0]?.price?.unit_amount;
  const newAmount = sub.items.data[0]?.price.unit_amount;

  if (prevAmount == null || prevAmount === newAmount) return;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const eventCurrency = sub.currency.toUpperCase();
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    newAmount ?? 0,
  );

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
      customerId: hashAnonymous(customerId),
      provider: "stripe",
      metadata: { previousValue: prevAmount, newValue: newAmount ?? 0 },
      eventHash: stripeEventHash(orgId, eventId),
      createdAt: new Date(),
    })
    .onConflictDoNothing();
}

async function handlePaymentFailed(orgId: string, invoice: Stripe.Invoice) {
  const subscriptionId = extractSubscriptionIdFromInvoice(invoice);

  if (!subscriptionId) return;

  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subscriptionId));
}
