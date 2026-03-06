import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
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

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: userRow.stripeCustomerId,
    return_url: `${origin}/organizations`,
  });

  return NextResponse.json({ url: portalSession.url });
}
