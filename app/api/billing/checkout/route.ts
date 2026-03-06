import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { users } from "@/db/schema";
import { stripe } from "@/lib/stripe";
import { getPlan } from "@/utils/plans";

const schema = z.object({
  planSlug: z.enum(["starter", "pro", "scale"]),
  currency: z.enum(["brl", "usd"]).default("brl"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { planSlug, currency, successUrl, cancelUrl } = parsed.data;

  const plan = getPlan(planSlug);
  const priceId = plan.stripePriceId[currency];

  if (!priceId) {
    return NextResponse.json({ error: "Price not configured for this currency" }, { status: 400 });
  }

  const [userRow] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      stripeCustomerId: users.stripeCustomerId,
      planSlug: users.planSlug,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!userRow) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (userRow.planSlug === planSlug) {
    return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
  }

  let stripeCustomerId = userRow.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: userRow.email,
      name: userRow.name,
      metadata: { groware_user_id: userRow.id },
    });

    stripeCustomerId = customer.id;

    await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, userRow.id));
  }

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "https://app.groware.io";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl ?? `${origin}/organizations?billing=success`,
    cancel_url: cancelUrl ?? `${origin}/organizations?billing=canceled`,
    metadata: {
      groware_user_id: userRow.id,
      plan_slug: planSlug,
    },
    subscription_data: {
      metadata: {
        groware_user_id: userRow.id,
        plan_slug: planSlug,
      },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
