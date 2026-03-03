"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import { getPageviewSessionsByLandingPage } from "@/utils/get-pageview-counts";
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
} from "@/interfaces/dashboard.interface";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

export async function getPages(
  organizationId: string,
  params: ILandingPageParams = {}
): Promise<ILandingPagesResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { data: [], pagination: { page: 1, limit: 30, total: 0, total_pages: 0 }, stepMeta: [] };
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

  const pvByLandingPage = await getPageviewSessionsByLandingPage(
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
  const totalPv = Array.from(pvByLandingPage.values()).reduce((sum, n) => sum + n, 0);
  globalCountMap.set("pageview", { total: totalPv, uniqueTotal: totalPv });

  const funnelSteps = injectCheckoutSteps(baseFunnelSteps, globalCountMap);
  const stepMeta = buildExtendedStepMeta(funnelSteps, globalCountMap);
  const stepConfigMap = new Map(funnelSteps.map((s) => [s.eventType, s]));
  const trackedInMeta = new Set(stepMeta.map((m) => m.key));

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
      entry.paymentCount = Number(row.total);
    }
  }

  for (const [landingPage, sessions] of pvByLandingPage) {
    if (search && !landingPage.toLowerCase().includes(search.toLowerCase())) continue;
    if (!pageMap.has(landingPage)) {
      pageMap.set(landingPage, { steps: {}, revenue: 0, paymentCount: 0 });
    }
    pageMap.get(landingPage)!.steps["pageview"] = sessions;
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
