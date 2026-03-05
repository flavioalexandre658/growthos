"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import { buildFunnelSteps } from "@/utils/build-funnel-steps";
import type { IDateFilter, ISourceDistribution } from "@/interfaces/dashboard.interface";

export async function getSourceDistribution(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<ISourceDistribution | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const [org] = await db
    .select({ funnelSteps: organizations.funnelSteps, timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) return null;

  const tz = org.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(filter, tz);

  const funnelSteps = buildFunnelSteps(org.funnelSteps ?? []);
  const firstNonPageview = funnelSteps.find((s) => s.eventType !== "pageview");
  const targetEventType = firstNonPageview?.eventType ?? "purchase";

  const rows = await db
    .select({
      source: sql<string>`COALESCE(${events.source}, 'direct')`,
      count: sql<number>`COUNT(*)`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, targetEventType),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate)
      )
    )
    .groupBy(sql`COALESCE(${events.source}, 'direct')`)
    .orderBy(sql`COUNT(*) DESC`);

  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

  if (total === 0) return { sources: [], total: 0 };

  const revenueRows = await db
    .select({
      source: sql<string>`COALESCE(${events.source}, 'direct')`,
      revenueInCents: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "purchase"),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate)
      )
    )
    .groupBy(sql`COALESCE(${events.source}, 'direct')`);

  const revenueMap = new Map(
    revenueRows.map((r) => [r.source, Number(r.revenueInCents)])
  );

  const TOP_N = 5;
  const topRows = rows.slice(0, TOP_N);
  const othersRows = rows.slice(TOP_N);
  const othersCount = othersRows.reduce((sum, r) => sum + Number(r.count), 0);
  const othersRevenue = othersRows.reduce(
    (sum, r) => sum + (revenueMap.get(r.source) ?? 0),
    0
  );

  const sources = topRows.map((r) => ({
    source: r.source,
    count: Number(r.count),
    percentage: Math.round((Number(r.count) / total) * 100),
    revenueInCents: revenueMap.get(r.source) ?? 0,
  }));

  if (othersCount > 0) {
    sources.push({
      source: "outros",
      count: othersCount,
      percentage: Math.round((othersCount / total) * 100),
      revenueInCents: othersRevenue,
    });
  }

  return { sources, total };
}
