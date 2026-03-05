import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { integrations, events, subscriptions } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { hashAnonymous } from "@/lib/hash";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import type { BillingInterval } from "@/utils/billing";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";

function stripeEventHash(orgId: string, externalId: string): string {
  return createHash("sha256").update(`${orgId}:${externalId}`).digest("hex").slice(0, 32);
}

function mapBillingInterval(interval: string, intervalCount = 1): BillingInterval {
  if (interval === "year") return "yearly";
  if (interval === "week") return "weekly";
  if (interval === "month") {
    if (intervalCount === 3) return "quarterly";
    if (intervalCount === 6) return "semiannual";
    if (intervalCount === 12) return "yearly";
  }
  return "monthly";
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
  switch (event.type) {
    case "invoice.payment_succeeded":
      await handleInvoicePaid(orgId, event.data.object as Stripe.Invoice, event.id);
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(
        orgId,
        event.data.object as Stripe.PaymentIntent,
        event.id,
      );
      break;
    case "charge.refunded":
      await handleChargeRefunded(orgId, event.data.object as Stripe.Charge, event.id);
      break;
    case "customer.subscription.created":
      await handleSubscriptionCreated(orgId, event.data.object as Stripe.Subscription, event.id);
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
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(orgId, event.data.object as Stripe.Invoice);
      break;
  }
}

async function handleInvoicePaid(orgId: string, invoice: Stripe.Invoice, eventId: string) {
  const rawCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
  const hashedCustomerId = hashAnonymous(rawCustomerId);

  const subRef = invoice.parent?.subscription_details?.subscription ?? null;
  const subscriptionId = subRef
    ? typeof subRef === "string"
      ? subRef
      : subRef.id
    : null;

  const isRecurring = !!subscriptionId;
  const acq = await lookupAcquisitionContext(orgId, hashedCustomerId);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "payment",
      grossValueInCents: invoice.amount_paid,
      currency: invoice.currency.toUpperCase(),
      billingType: isRecurring ? "recurring" : "one_time",
      subscriptionId,
      customerId: hashedCustomerId,
      paymentMethod: "credit_card",
      provider: "stripe",
      eventHash: stripeEventHash(orgId, eventId),
      createdAt: new Date(invoice.created * 1000),
      source: acq?.source ?? null,
      medium: acq?.medium ?? null,
      campaign: acq?.campaign ?? null,
      content: acq?.content ?? null,
      landingPage: acq?.landingPage ?? null,
      entryPage: acq?.entryPage ?? null,
      sessionId: acq?.sessionId ?? null,
    })
    .onConflictDoNothing();

  if (subscriptionId) {
    await db
      .update(subscriptions)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(subscriptions.subscriptionId, subscriptionId));
  }
}

async function handlePaymentIntentSucceeded(
  orgId: string,
  pi: Stripe.PaymentIntent,
  eventId: string,
) {
  if (!(pi as Stripe.PaymentIntent & { invoice?: string | null }).invoice) {
    const rawCustomerId =
      typeof pi.customer === "string" ? pi.customer : pi.customer?.id ?? null;
    const hashedCustomerId = rawCustomerId ? hashAnonymous(rawCustomerId) : null;

    const acq = hashedCustomerId
      ? await lookupAcquisitionContext(orgId, hashedCustomerId)
      : null;

    const pm = pi.payment_method_types?.[0] ?? "credit_card";

    await db
      .insert(events)
      .values({
        organizationId: orgId,
        eventType: "payment",
        grossValueInCents: pi.amount_received ?? pi.amount,
        currency: pi.currency.toUpperCase(),
        billingType: "one_time",
        customerId: hashedCustomerId ?? undefined,
        paymentMethod: pm,
        provider: "stripe",
        eventHash: stripeEventHash(orgId, eventId),
        createdAt: new Date((pi.created ?? Date.now() / 1000) * 1000),
        source: acq?.source ?? null,
        medium: acq?.medium ?? null,
        campaign: acq?.campaign ?? null,
        content: acq?.content ?? null,
        landingPage: acq?.landingPage ?? null,
        entryPage: acq?.entryPage ?? null,
        sessionId: acq?.sessionId ?? null,
      })
      .onConflictDoNothing();
  }
}

async function handleChargeRefunded(orgId: string, charge: Stripe.Charge, eventId: string) {
  const refundedAmount = charge.amount_refunded;
  if (!refundedAmount) return;

  const rawCustomerId =
    typeof charge.customer === "string" ? charge.customer : charge.customer?.id ?? null;
  const hashedCustomerId = rawCustomerId ? hashAnonymous(rawCustomerId) : null;

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "refund",
      grossValueInCents: -refundedAmount,
      currency: charge.currency.toUpperCase(),
      billingType: "one_time",
      customerId: hashedCustomerId ?? undefined,
      provider: "stripe",
      eventHash: stripeEventHash(orgId, eventId),
      metadata: { chargeId: charge.id, paymentIntent: charge.payment_intent },
      createdAt: new Date(),
    })
    .onConflictDoNothing();
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

  await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      subscriptionId: sub.id,
      customerId: hashAnonymous(customerId),
      planId: item?.price.id ?? "unknown",
      planName: item?.price.nickname ?? item?.price.id ?? "Plano",
      status: "active",
      valueInCents: item?.price.unit_amount ?? 0,
      currency: sub.currency.toUpperCase(),
      billingInterval,
      startedAt: new Date(sub.start_date * 1000),
    })
    .onConflictDoUpdate({
      target: [subscriptions.subscriptionId],
      set: {
        status: "active",
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

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "subscription_canceled",
      grossValueInCents: item?.price.unit_amount ?? 0,
      currency: sub.currency.toUpperCase(),
      billingType: "recurring",
      billingInterval: mapBillingInterval(interval, intervalCount),
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

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "subscription_changed",
      grossValueInCents: newAmount ?? 0,
      currency: sub.currency.toUpperCase(),
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
  const subRef = invoice.parent?.subscription_details?.subscription ?? null;
  const subscriptionId = subRef
    ? typeof subRef === "string"
      ? subRef
      : subRef.id
    : null;

  if (!subscriptionId) return;

  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subscriptionId));
}
