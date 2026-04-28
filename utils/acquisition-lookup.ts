import { db } from "@/db";
import { events, payments, customers } from "@/db/schema";
import { and, eq, isNotNull, asc } from "drizzle-orm";

export interface AcquisitionHints {
  email?: string | null;
  sessionId?: string | null;
  clickId?: string | null;
}

export interface AcquisitionContext {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  clickId: string | null;
  landingPage: string | null;
  entryPage: string | null;
  sessionId: string | null;
  matchedBy: "customer_id" | "session_id" | "email" | "click_id" | "fallback";
}

export async function lookupAcquisitionContext(
  orgId: string,
  customerId: string,
  hints?: AcquisitionHints,
): Promise<AcquisitionContext | null> {
  if (customerId) {
    const recentRows = await db
      .select({
        source: events.source,
        medium: events.medium,
        campaign: events.campaign,
        content: events.content,
        term: events.term,
        clickId: events.clickId,
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

    if (recentRows[0]) {
      return { ...recentRows[0], matchedBy: "customer_id" };
    }

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

    if (historicalRows[0]) {
      return {
        ...historicalRows[0],
        term: null,
        clickId: null,
        matchedBy: "customer_id",
      };
    }
  }

  if (hints?.sessionId) {
    const sessionRows = await db
      .select({
        source: events.source,
        medium: events.medium,
        campaign: events.campaign,
        content: events.content,
        term: events.term,
        clickId: events.clickId,
        landingPage: events.landingPage,
        entryPage: events.entryPage,
        sessionId: events.sessionId,
      })
      .from(events)
      .where(
        and(
          eq(events.organizationId, orgId),
          eq(events.sessionId, hints.sessionId),
          isNotNull(events.source),
        ),
      )
      .orderBy(asc(events.createdAt))
      .limit(1);

    if (sessionRows[0]) {
      return { ...sessionRows[0], matchedBy: "session_id" };
    }
  }

  if (hints?.email) {
    const customerRows = await db
      .select({
        source: customers.firstSource,
        medium: customers.firstMedium,
        campaign: customers.firstCampaign,
        content: customers.firstContent,
        term: customers.firstTerm,
        clickId: customers.firstClickId,
        landingPage: customers.firstLandingPage,
        sessionId: customers.firstSessionId,
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, orgId),
          eq(customers.email, hints.email),
          isNotNull(customers.firstSource),
        ),
      )
      .orderBy(asc(customers.firstSeenAt))
      .limit(1);

    if (customerRows[0]) {
      return {
        source: customerRows[0].source,
        medium: customerRows[0].medium,
        campaign: customerRows[0].campaign,
        content: customerRows[0].content,
        term: customerRows[0].term,
        clickId: customerRows[0].clickId,
        landingPage: customerRows[0].landingPage,
        entryPage: null,
        sessionId: customerRows[0].sessionId,
        matchedBy: "email",
      };
    }
  }

  if (hints?.clickId) {
    const clickRows = await db
      .select({
        source: events.source,
        medium: events.medium,
        campaign: events.campaign,
        content: events.content,
        term: events.term,
        clickId: events.clickId,
        landingPage: events.landingPage,
        entryPage: events.entryPage,
        sessionId: events.sessionId,
      })
      .from(events)
      .where(
        and(
          eq(events.organizationId, orgId),
          eq(events.clickId, hints.clickId),
          isNotNull(events.source),
        ),
      )
      .orderBy(asc(events.createdAt))
      .limit(1);

    if (clickRows[0]) {
      return { ...clickRows[0], matchedBy: "click_id" };
    }
  }

  return null;
}
