"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { integrations, apiKeys, events } from "@/db/schema";

export interface OrgDataSources {
  hasGateway: boolean;
  hasTracker: boolean;
  hasRealData: boolean;
}

export async function getOrgDataSources(
  organizationId: string,
): Promise<OrgDataSources> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { hasGateway: false, hasTracker: false, hasRealData: false };

  const [gatewayRow, apiKeyRow, trackerEventRow, anyEventRow] = await Promise.all([
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
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.organizationId, organizationId),
          eq(apiKeys.isActive, true),
        ),
      )
      .limit(1),
    db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          isNull(events.provider),
        ),
      )
      .limit(1),
    db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.organizationId, organizationId))
      .limit(1),
  ]);

  const hasGateway = gatewayRow.length > 0;
  const hasTracker = apiKeyRow.length > 0 && trackerEventRow.length > 0;

  return {
    hasGateway,
    hasTracker,
    hasRealData: hasGateway || hasTracker || anyEventRow.length > 0,
  };
}
