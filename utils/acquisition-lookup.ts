import { db } from "@/db";
import { events, payments } from "@/db/schema";
import { and, eq, isNotNull, asc } from "drizzle-orm";

export interface AcquisitionContext {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  landingPage: string | null;
  entryPage: string | null;
  sessionId: string | null;
}

export async function lookupAcquisitionContext(
  orgId: string,
  customerId: string,
): Promise<AcquisitionContext | null> {
  const recentRows = await db
    .select({
      source: events.source,
      medium: events.medium,
      campaign: events.campaign,
      content: events.content,
      landingPage: events.landingPage,
      entryPage: events.entryPage,
      sessionId: events.sessionId,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, orgId),
        eq(events.customerId, customerId),
        isNotNull(events.source),
      ),
    )
    .orderBy(asc(events.createdAt))
    .limit(1);

  if (recentRows[0]) return recentRows[0];

  const historicalRows = await db
    .select({
      source: payments.source,
      medium: payments.medium,
      campaign: payments.campaign,
      content: payments.content,
      landingPage: payments.landingPage,
      entryPage: payments.entryPage,
      sessionId: payments.sessionId,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, orgId),
        eq(payments.customerId, customerId),
        isNotNull(payments.source),
        eq(payments.billingReason, "subscription_create"),
      ),
    )
    .orderBy(asc(payments.createdAt))
    .limit(1);

  return historicalRows[0] ?? null;
}
