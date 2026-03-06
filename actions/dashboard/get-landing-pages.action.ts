"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations, payments } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import { getPageviewSessionsByEntryPage } from "@/utils/get-pageview-counts";
import {
  buildFunnelSteps,
  getAllQueryEventTypes,
  injectCheckoutSteps,
  buildExtendedStepMeta,
} from "@/utils/build-funnel-steps";
import type {
  ILandingPageParams,
  ILandingPageData,
  ILandingPagesResult,
  IPageScatterPoint,
} from "@/interfaces/dashboard.interface";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

export async function getLandingPages(
  organizationId: string,
  params: ILandingPageParams = {}
): Promise<ILandingPagesResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      data: [],
      pagination: { page: 1, limit: 30, total: 0, total_pages: 0 },
      stepMeta: [],
      totalPages: 0,
      pagesWithRevenue: 0,
      totalRevenue: 0,
      bestConversionPage: "",
      bestConversionRate: "0%",
      biggestOpportunityPage: "",
      biggestOpportunityVisits: 0,
      scatterData: [],
    };
  }

  const [org] = await db
    .select({ funnelSteps: organizations.funnelSteps, timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(params, tz);
  const page = params.page ?? 1;
  const limit = params.limit ?? 30;
  const orderBy = params.order_by ?? "revenue";
  const search = params.search?.trim() ?? "";

  const baseFunnelSteps: IFunnelStepConfig[] = buildFunnelSteps(org?.funnelSteps ?? []);
  const allEventTypes = getAllQueryEventTypes(baseFunnelSteps).filter(
    (t) => t !== "pageview"
  );

  const rawRows = await db
    .select({
      page: events.entryPage,
      eventType: events.eventType,
      total: sql<number>`COUNT(*)`,
      uniqueTotal: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate),
        sql`${events.entryPage} IS NOT NULL`,
        inArray(events.eventType, allEventTypes)
      )
    )
    .groupBy(events.entryPage, events.eventType);

  const revenueByPage = await db
    .select({
      page: payments.entryPage,
      grossRev: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
      purchaseCount: sql<number>`COUNT(*)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        gte(payments.createdAt, startDate),
        lte(payments.createdAt, endDate),
        sql`${payments.entryPage} IS NOT NULL`,
        inArray(payments.eventType, ["purchase", "renewal"])
      )
    )
    .groupBy(payments.entryPage);

  const revenuePageMap = new Map<string, { revenue: number; purchaseCount: number }>();
  for (const row of revenueByPage) {
    if (row.page) {
      revenuePageMap.set(row.page, { revenue: Number(row.grossRev), purchaseCount: Number(row.purchaseCount) });
    }
  }

  const pvByEntryPage = await getPageviewSessionsByEntryPage(
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
  const totalPv = Array.from(pvByEntryPage.values()).reduce((sum, n) => sum + n, 0);
  globalCountMap.set("pageview", { total: totalPv, uniqueTotal: totalPv });

  const funnelSteps = injectCheckoutSteps(baseFunnelSteps, globalCountMap);
  const stepMeta = buildExtendedStepMeta(funnelSteps, globalCountMap);
  const stepConfigMap = new Map(funnelSteps.map((s) => [s.eventType, s]));
  const trackedInMeta = new Set(stepMeta.map((m) => m.key));

  const pageMap = new Map<
    string,
    { steps: Record<string, number>; revenue: number; purchaseCount: number }
  >();

  for (const row of rawRows) {
    if (!row.page) continue;
    if (search && !row.page.toLowerCase().includes(search.toLowerCase())) continue;

    if (!pageMap.has(row.page)) {
      pageMap.set(row.page, { steps: {}, revenue: 0, purchaseCount: 0 });
    }
    const entry = pageMap.get(row.page)!;

    const stepConfig = stepConfigMap.get(row.eventType);
    if (stepConfig) {
      const count = stepConfig.countUnique
        ? Number(row.uniqueTotal)
        : Number(row.total);
      entry.steps[row.eventType] = count;
    } else if (row.eventType === "checkout_abandoned" && trackedInMeta.has("checkout_abandoned")) {
      entry.steps["checkout_abandoned"] = Number(row.total);
    }
  }

  for (const [pagePath, revData] of revenuePageMap) {
    if (search && !pagePath.toLowerCase().includes(search.toLowerCase())) continue;
    if (!pageMap.has(pagePath)) {
      pageMap.set(pagePath, { steps: {}, revenue: 0, purchaseCount: 0 });
    }
    const entry = pageMap.get(pagePath)!;
    entry.revenue = revData.revenue;
    entry.purchaseCount = revData.purchaseCount;
  }

  for (const [entryPage, sessions] of pvByEntryPage) {
    if (search && !entryPage.toLowerCase().includes(search.toLowerCase())) continue;
    if (!pageMap.has(entryPage)) {
      pageMap.set(entryPage, { steps: {}, revenue: 0, purchaseCount: 0 });
    }
    pageMap.get(entryPage)!.steps["pageview"] = sessions;
  }

  const allPages: ILandingPageData[] = Array.from(pageMap.entries()).map(
    ([pagePath, data]) => {
      const firstStepKey = funnelSteps[0]?.eventType;
      const lastStepKey = funnelSteps[funnelSteps.length - 1]?.eventType;
      const firstCount = firstStepKey ? (data.steps[firstStepKey] ?? 0) : 0;
      const lastCount = lastStepKey ? (data.steps[lastStepKey] ?? 0) : data.purchaseCount;
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

  const firstStepKeyForVisits = funnelSteps[0]?.eventType ?? "pageview";

  const totalPages = allPages.length;
  const pagesWithRevenue = allPages.filter((p) => p.revenue > 0).length;
  const totalRevenue = allPages.reduce((s, p) => s + p.revenue, 0);

  const qualifiedForConversion = allPages.filter(
    (p) => (p.steps[firstStepKeyForVisits] ?? p.steps["pageview"] ?? 0) >= 5
  );
  const bestConversionPage = qualifiedForConversion.length > 0
    ? qualifiedForConversion.reduce((best, p) =>
        parseFloat(p.conversion_rate) > parseFloat(best.conversion_rate) ? p : best
      ).page
    : "";
  const bestConversionRate = qualifiedForConversion.length > 0
    ? qualifiedForConversion.reduce((best, p) =>
        parseFloat(p.conversion_rate) > parseFloat(best.conversion_rate) ? p : best
      ).conversion_rate
    : "0%";

  const opportunityCandidates = allPages.filter(
    (p) => parseFloat(p.conversion_rate) < 1
  );
  const biggestOpportunity = opportunityCandidates.length > 0
    ? opportunityCandidates.reduce((best, p) => {
        const visits = p.steps[firstStepKeyForVisits] ?? p.steps["pageview"] ?? 0;
        const bestVisits = best.steps[firstStepKeyForVisits] ?? best.steps["pageview"] ?? 0;
        return visits > bestVisits ? p : best;
      })
    : null;
  const biggestOpportunityPage = biggestOpportunity?.page ?? "";
  const biggestOpportunityVisits = biggestOpportunity
    ? (biggestOpportunity.steps[firstStepKeyForVisits] ?? biggestOpportunity.steps["pageview"] ?? 0)
    : 0;

  const scatterData: IPageScatterPoint[] = allPages
    .map((p) => ({
      page: p.page,
      visits: p.steps[firstStepKeyForVisits] ?? p.steps["pageview"] ?? 0,
      conversionRate: parseFloat(p.conversion_rate),
      revenue: p.revenue,
    }))
    .filter((p) => p.visits > 0)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 150);

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
    totalPages,
    pagesWithRevenue,
    totalRevenue,
    bestConversionPage,
    bestConversionRate,
    biggestOpportunityPage,
    biggestOpportunityVisits,
    scatterData,
  };
}
