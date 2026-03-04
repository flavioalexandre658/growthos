"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import { getPageviewSessionsByDate } from "@/utils/get-pageview-counts";
import {
  buildFunnelSteps,
  getAllQueryEventTypes,
  injectCheckoutSteps,
  buildExtendedStepMeta,
} from "@/utils/build-funnel-steps";
import type { IDateFilter, IDailyData, IDailyResult } from "@/interfaces/dashboard.interface";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

export async function getDaily(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IDailyResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { rows: [], stepMeta: [] };

  const [org] = await db
    .select({ funnelSteps: organizations.funnelSteps, timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(filter, tz);

  const baseFunnelSteps: IFunnelStepConfig[] = buildFunnelSteps(org?.funnelSteps ?? []);
  const allEventTypes = getAllQueryEventTypes(baseFunnelSteps).filter(
    (t) => t !== "pageview"
  );

  const tzLiteral = sql.raw(`'${tz.replace(/'/g, "")}'`);
  const dateTzExpr = sql`DATE(${events.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE ${tzLiteral})`;

  const rawRows = await db
    .select({
      date: sql<string>`${dateTzExpr}::text`,
      eventType: events.eventType,
      total: sql<number>`COUNT(*)`,
      uniqueTotal: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
      grossRev: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)`,
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
    .groupBy(dateTzExpr, events.eventType)
    .orderBy(sql`${dateTzExpr} ASC`);

  const pvByDate = await getPageviewSessionsByDate(
    organizationId,
    startDate,
    endDate,
    tz
  );

  const globalCountMap = new Map<string, { total: number; uniqueTotal: number }>();
  for (const row of rawRows) {
    const existing = globalCountMap.get(row.eventType) ?? { total: 0, uniqueTotal: 0 };
    globalCountMap.set(row.eventType, {
      total: existing.total + Number(row.total),
      uniqueTotal: existing.uniqueTotal + Number(row.uniqueTotal),
    });
  }
  const totalPv = Array.from(pvByDate.values()).reduce((sum, n) => sum + n, 0);
  globalCountMap.set("pageview", { total: totalPv, uniqueTotal: totalPv });

  const funnelSteps = injectCheckoutSteps(baseFunnelSteps, globalCountMap);
  const stepMeta = buildExtendedStepMeta(funnelSteps, globalCountMap);
  const stepConfigMap = new Map(funnelSteps.map((s) => [s.eventType, s]));
  const trackedInMeta = new Set(stepMeta.map((m) => m.key));

  const dateMap = new Map<
    string,
    { steps: Record<string, number>; revenue: number }
  >();

  for (const row of rawRows) {
    if (!dateMap.has(row.date)) {
      dateMap.set(row.date, { steps: {}, revenue: 0 });
    }
    const entry = dateMap.get(row.date)!;

    const stepConfig = stepConfigMap.get(row.eventType);
    if (stepConfig) {
      const count = stepConfig.countUnique
        ? Number(row.uniqueTotal)
        : Number(row.total);
      entry.steps[row.eventType] = count;
    } else if (row.eventType === "checkout_abandoned" && trackedInMeta.has("checkout_abandoned")) {
      entry.steps["checkout_abandoned"] = Number(row.total);
    }

    if (row.eventType === "payment") {
      entry.revenue = Number(row.grossRev);
    }
  }

  for (const [date, sessions] of pvByDate) {
    if (!dateMap.has(date)) {
      dateMap.set(date, { steps: {}, revenue: 0 });
    }
    dateMap.get(date)!.steps["pageview"] = sessions;
  }

  const rows: IDailyData[] = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  return { rows, stepMeta };
}
