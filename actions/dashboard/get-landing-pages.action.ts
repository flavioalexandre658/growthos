"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type {
  ILandingPageParams,
  ILandingPageData,
  ILandingPagesResult,
} from "@/interfaces/dashboard.interface";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

export async function getLandingPages(
  organizationId: string,
  params: ILandingPageParams = {}
): Promise<ILandingPagesResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { data: [], pagination: { page: 1, limit: 30, total: 0, total_pages: 0 }, stepMeta: [] };
  }

  const { startDate, endDate } = resolveDateRange(params);
  const page = params.page ?? 1;
  const limit = params.limit ?? 30;
  const orderBy = params.order_by ?? "revenue";
  const search = params.search?.trim() ?? "";

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
      page: events.landingPage,
      eventType: events.eventType,
      total: sql<number>`COUNT(*)`,
      uniqueTotal: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
      grossRev: sql<number>`COALESCE(SUM(${events.grossValueInCents}), 0)`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate),
        sql`${events.landingPage} IS NOT NULL`,
        inArray(events.eventType, allEventTypes)
      )
    )
    .groupBy(events.landingPage, events.eventType);

  const pageMap = new Map<
    string,
    { steps: Record<string, number>; revenue: number; paymentCount: number }
  >();

  for (const row of rawRows) {
    if (!row.page) continue;
    if (search && !row.page.toLowerCase().includes(search.toLowerCase())) continue;

    if (!pageMap.has(row.page)) {
      pageMap.set(row.page, { steps: {}, revenue: 0, paymentCount: 0 });
    }
    const entry = pageMap.get(row.page)!;

    const stepConfig = funnelSteps.find((s) => s.eventType === row.eventType);
    if (stepConfig) {
      const count = stepConfig.countUnique
        ? Number(row.uniqueTotal)
        : Number(row.total);
      entry.steps[row.eventType] = count;
    }

    if (row.eventType === "payment") {
      entry.revenue = Number(row.grossRev);
      entry.paymentCount = Number(row.total);
    }
  }

  const allPages: ILandingPageData[] = Array.from(pageMap.entries()).map(
    ([pagePath, data]) => {
      const firstStepKey = funnelSteps[0]?.eventType;
      const lastStepKey = funnelSteps[funnelSteps.length - 1]?.eventType;
      const firstCount = firstStepKey ? (data.steps[firstStepKey] ?? 0) : 0;
      const lastCount = lastStepKey ? (data.steps[lastStepKey] ?? 0) : data.paymentCount;
      const conversionRate =
        firstCount > 0 ? ((lastCount / firstCount) * 100).toFixed(1) + "%" : "0%";

      return {
        page: pagePath,
        steps: data.steps,
        revenue: data.revenue,
        conversion_rate: conversionRate,
      };
    }
  );

  const sorted = [...allPages].sort((a, b) => {
    if (orderBy === "revenue") return b.revenue - a.revenue;
    if (orderBy === "conversion_rate") {
      return parseFloat(b.conversion_rate) - parseFloat(a.conversion_rate);
    }
    const aVal = a.steps[orderBy] ?? 0;
    const bVal = b.steps[orderBy] ?? 0;
    return bVal - aVal;
  });

  if (params.order_dir === "ASC") sorted.reverse();

  const total = sorted.length;
  const offset = (page - 1) * limit;
  const data = sorted.slice(offset, offset + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    stepMeta,
  };
}
