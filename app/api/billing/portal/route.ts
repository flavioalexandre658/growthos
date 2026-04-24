import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { users } from "@/db/schema";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [userRow] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!userRow?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No active subscription found. Subscribe to a plan first." },
      { status: 400 },
    );
  }

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "https://app.groware.io";

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userRow.stripeCustomerId,
      return_url: `${origin}/organizations`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[billing/portal] stripe error", {
      userId: session.user.id,
      stripeCustomerId: userRow.stripeCustomerId,
      error: err,
    });

    if (err instanceof Stripe.errors.StripeError) {
      const message = err.message ?? "Stripe error";

      if (/default configuration has not been created/i.test(message)) {
        return NextResponse.json(
          {
            error:
              "Stripe Customer Portal is not configured. An admin needs to save the portal settings at https://dashboard.stripe.com/settings/billing/portal",
          },
          { status: 500 },
        );
      }

      if (err.code === "resource_missing") {
        return NextResponse.json(
          {
            error:
              "Stripe customer not found. This usually means the stored customer belongs to a different Stripe mode (test vs live) than the current API key.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ error: "Unexpected error opening billing portal" }, { status: 500 });
  }
}
