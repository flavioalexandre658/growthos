"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type { IDateFilter, IDailyData, IDailyResult } from "@/interfaces/dashboard.interface";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

export async function getDaily(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IDailyResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { rows: [], stepMeta: [] };

  const { startDate, endDate } = resolveDateRange(filter);

  const [org] = await db
    .select({ funnelSteps: organizations.funnelSteps })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const funnelSteps: IFunnelStepConfig[] = org?.funnelSteps ?? [];
  const stepEventTypes = funnelSteps.map((s) => s.eventType);
  const allEventTypes = [...new Set([...stepEventTypes, "payment"])];

  const stepMeta = funnelSteps.map((s) => ({ key: s.eventType, label: s.label }));

  const rawRows = await db
    .select({
      date: sql<string>`DATE(${events.createdAt})::text`,
      eventType: events.eventType,
      total: sql<number>`COUNT(*)`,
      uniqueTotal: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
      grossRev: sql<number>`COALESCE(SUM(${events.grossValueInCents}), 0)`,
      netRev: sql<number>`COALESCE(SUM(${events.netValueInCents}), 0)`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate),
        inArray(events.eventType, allEventTypes)
      )
    )
    .groupBy(sql`DATE(${events.createdAt})`, events.eventType)
    .orderBy(sql`DATE(${events.createdAt}) ASC`);

  const dateMap = new Map<
    string,
    { steps: Record<string, number>; revenue: number; net_revenue: number }
  >();

  for (const row of rawRows) {
    if (!dateMap.has(row.date)) {
      dateMap.set(row.date, { steps: {}, revenue: 0, net_revenue: 0 });
    }
    const entry = dateMap.get(row.date)!;

    const stepConfig = funnelSteps.find((s) => s.eventType === row.eventType);
    if (stepConfig) {
      const count = stepConfig.countUnique
        ? Number(row.uniqueTotal)
        : Number(row.total);
      entry.steps[row.eventType] = count;
    }

    if (row.eventType === "payment") {
      entry.revenue = Number(row.grossRev);
      entry.net_revenue = Number(row.netRev);
    }
  }

  const rows: IDailyData[] = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  return { rows, stepMeta };
}
