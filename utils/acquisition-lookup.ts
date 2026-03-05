import { db } from "@/db";
import { events } from "@/db/schema";
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
  const rows = await db
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

  return rows[0] ?? null;
}
