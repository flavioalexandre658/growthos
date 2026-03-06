import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { PlanSlug } from "@/utils/plans";

function resolveGrowarePlanSlug(priceId: string): PlanSlug {
  const priceToSlug: Record<string, PlanSlug> = {
    "price_1T84jELEMla6y3l2HGzZd4Pf": "starter",
    "price_1T84jFLEMla6y3l2pH9PrugY": "starter",
    "price_1T84jFLEMla6y3l2tYkehFAS": "pro",
    "price_1T84jGLEMla6y3l2hRXqgx5z": "pro",
    "price_1T84jHLEMla6y3l2UBMueu5s": "scale",
    "price_1T84jHLEMla6y3l2z7j3nhcX": "scale",
  };

  return priceToSlug[priceId] ?? "free";
}

async function findUserByStripeCustomer(customerId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  return row?.id ?? null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || !session.customer || !session.subscription) return;

  const userId =
    (session.metadata?.groware_user_id as string | undefined) ??
    (await findUserByStripeCustomer(session.customer as string));

  if (!userId) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const priceId = subscription.items.data[0]?.price.id ?? "";
  const planSlug = resolveGrowarePlanSlug(priceId);

  await db.update(users).set({
    planSlug,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
    stripeCustomerId: session.customer as string,
  }).where(eq(users.id, userId));
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = await findUserByStripeCustomer(customerId);
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price.id ?? "";
  const planSlug = resolveGrowarePlanSlug(priceId);

  await db.update(users).set({
    planSlug,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
  }).where(eq(users.id, userId));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = await findUserByStripeCustomer(customerId);
  if (!userId) return;

  await db.update(users).set({
    planSlug: "free",
    stripeSubscriptionId: null,
    subscriptionStatus: "canceled",
    currentPeriodEnd: null,
  }).where(eq(users.id, userId));
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const userId = await findUserByStripeCustomer(customerId);
  if (!userId) return;

  await db.update(users).set({
    subscriptionStatus: "past_due",
  }).where(eq(users.id, userId));
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
  }

  return NextResponse.json({ received: true });
}
