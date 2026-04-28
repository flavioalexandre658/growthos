"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations, events, fixedCosts, variableCosts, orgMembers, organizations } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { ITourProgress } from "@/interfaces/tour.interface";
import { isPlatformAdmin } from "@/utils/is-platform-admin";

export async function getTourProgress(organizationId: string): Promise<ITourProgress | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const org = await db
    .select({ funnelSteps: organizations.funnelSteps })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org[0]) return null;

  const funnelEventTypes = (org[0].funnelSteps ?? [])
    .map((s) => s.eventType)
    .filter((t) => t !== "pageview");

  const [
    activeIntegration,
    pageviewEvent,
    funnelEvent,
    fixedCost,
    variableCost,
    memberRow,
  ] = await Promise.all([
    db
      .select({ id: integrations.id })
      .from(integrations)
      .where(
        and(
          eq(integrations.organizationId, organizationId),
          eq(integrations.status, "active"),
        ),
      )
      .limit(1),
    db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.eventType, "pageview"),
        ),
      )
      .limit(1),
    funnelEventTypes.length > 0
      ? db
          .select({ id: events.id })
          .from(events)
          .where(
            and(
              eq(events.organizationId, organizationId),
              inArray(events.eventType, funnelEventTypes),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    db
      .select({ id: fixedCosts.id })
      .from(fixedCosts)
      .where(eq(fixedCosts.organizationId, organizationId))
      .limit(1),
    db
      .select({ id: variableCosts.id })
      .from(variableCosts)
      .where(eq(variableCosts.organizationId, organizationId))
      .limit(1),
    db
      .select({ tourState: orgMembers.tourState })
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.organizationId, organizationId),
          eq(orgMembers.userId, session.user.id),
        ),
      )
      .limit(1),
  ]);

  const tourState = isPlatformAdmin(session.user.email) ? null : (memberRow[0]?.tourState ?? null);

  const gatewayConnected = activeIntegration.length > 0;
  const trackerInstalled = pageviewEvent.length > 0;
  const funnelEventReceived = funnelEvent.length > 0;
  const costsConfigured = fixedCost.length > 0 || variableCost.length > 0;
  const aiExplored = tourState?.aiPageVisited === true;
  const checklistDismissed = !!tourState?.checklistDismissedAt;

  const items = [gatewayConnected, trackerInstalled, funnelEventReceived, costsConfigured, aiExplored];
  const completedCount = items.filter(Boolean).length;
  const totalCount = items.length;
  const allComplete = completedCount === totalCount;

  return {
    gatewayConnected,
    trackerInstalled,
    funnelEventReceived,
    costsConfigured,
    aiExplored,
    allComplete,
    completedCount,
    totalCount,
    checklistDismissed,
  };
}
