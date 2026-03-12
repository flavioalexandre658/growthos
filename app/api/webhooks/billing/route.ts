import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PLANS, type PlanSlug } from "@/utils/plans";

function resolveGrowarePlanSlug(priceId: string): PlanSlug {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId.brl === priceId || plan.stripePriceId.usd === priceId) {
      return plan.slug;
    }
  }
  return "free";
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
  if (session.mode !== "subscription" || !session.customer || !session.subscription) {
    console.log("[billing-webhook] checkout.session.completed skipped", { mode: session.mode, hasCustomer: !!session.customer, hasSubscription: !!session.subscription });
    return;
  }

  const userId =
    (session.metadata?.groware_user_id as string | undefined) ??
    (await findUserByStripeCustomer(session.customer as string));

  if (!userId) {
    console.error("[billing-webhook] handleCheckoutCompleted: userId not found", { customerId: session.customer, metadata: session.metadata });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const priceId = subscription.items.data[0]?.price.id ?? "";
  const planSlug = resolveGrowarePlanSlug(priceId);

  console.log("[billing-webhook] handleCheckoutCompleted: updating plan", { userId, priceId, planSlug, subscriptionId: subscription.id });

  await db.update(users).set({
    planSlug,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
    stripeCustomerId: session.customer as string,
  }).where(eq(users.id, userId));

  console.log("[billing-webhook] handleCheckoutCompleted: done", { userId, planSlug });

  const apiKey = process.env.GROWARE_API_KEY;
  if (apiKey && session.amount_total && session.currency) {
    await fetch("https://groware.io/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        event_type: "purchase",
        dedupe: session.id,
        gross_value: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        payment_method: "credit_card",
        product_id: planSlug,
        product_name: planSlug,
        customer_id: userId,
        customer_type: "new",
      }),
    }).catch((err) => {
      console.error("[groware-purchase]", err);
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = await findUserByStripeCustomer(customerId);

  if (!userId) {
    console.error("[billing-webhook] handleSubscriptionUpdated: userId not found", { customerId });
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? "";
  const planSlug = resolveGrowarePlanSlug(priceId);

  console.log("[billing-webhook] handleSubscriptionUpdated: updating plan", { userId, priceId, planSlug, status: subscription.status });

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

  console.log("[billing-webhook] event received", { type: event.type, id: event.id });

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
