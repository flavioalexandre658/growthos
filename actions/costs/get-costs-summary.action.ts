"use server";

import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import { db } from "@/db";
import { payments, fixedCosts, variableCosts, organizations, marketingSpends } from "@/db/schema";
import { buildProfitAndLoss } from "@/utils/build-pl";
import { resolvePeriodDays } from "@/utils/resolve-period-days";
import { resolveDateRange } from "@/utils/resolve-date-range";
import dayjs from "@/utils/dayjs";
import type { ICostsSummary, IRevenueBySegment } from "@/interfaces/cost.interface";

export async function getCostsSummary(organizationId: string): Promise<ICostsSummary> {
  const filter = { period: "this_month" as const };

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(filter, tz);
  const periodDays = resolvePeriodDays(filter, tz);
  const startStr = dayjs(startDate).tz(tz).format("YYYY-MM-DD");
  const endStr = dayjs(endDate).tz(tz).format("YYYY-MM-DD");

  const baseCondition = and(
    eq(payments.organizationId, organizationId),
    gte(payments.createdAt, startDate),
    lte(payments.createdAt, endDate)
  );

  const [summary] = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})) FILTER (WHERE ${payments.eventType} IN ('purchase', 'renewal')), 0)`,
      totalDiscounts: sql<number>`COALESCE(SUM(${payments.discountInCents}) FILTER (WHERE ${payments.eventType} IN ('purchase', 'renewal')), 0)`,
    })
    .from(payments)
    .where(baseCondition);

  const segmentRows = await db
    .select({
      paymentMethod: payments.paymentMethod,
      billingType: payments.billingType,
      category: payments.category,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
    })
    .from(payments)
    .where(and(baseCondition, inArray(payments.eventType, REVENUE_EVENT_TYPES)))
    .groupBy(payments.paymentMethod, payments.billingType, payments.category);

  const revenueBySegment: IRevenueBySegment = { paymentMethod: {}, billingType: {}, category: {} };
  for (const row of segmentRows) {
    const rev = Number(row.revenue);
    if (row.paymentMethod) {
      revenueBySegment.paymentMethod[row.paymentMethod] = (revenueBySegment.paymentMethod[row.paymentMethod] ?? 0) + rev;
    }
    if (row.billingType) {
      revenueBySegment.billingType[row.billingType] = (revenueBySegment.billingType[row.billingType] ?? 0) + rev;
    }
    if (row.category && revenueBySegment.category) {
      revenueBySegment.category[row.category] = (revenueBySegment.category[row.category] ?? 0) + rev;
    }
  }

  const [orgFixedCosts, orgVariableCosts, marketingRows] = await Promise.all([
    db.select().from(fixedCosts).where(eq(fixedCosts.organizationId, organizationId)),
    db.select().from(variableCosts).where(eq(variableCosts.organizationId, organizationId)),
    db
      .select({
        source: marketingSpends.source,
        sourceLabel: marketingSpends.sourceLabel,
        totalAmountInCents: sql<number>`COALESCE(SUM(${marketingSpends.amountInCents}), 0)`,
      })
      .from(marketingSpends)
      .where(
        and(
          eq(marketingSpends.organizationId, organizationId),
          gte(marketingSpends.spentAt, startStr),
          lte(marketingSpends.spentAt, endStr)
        )
      )
      .groupBy(marketingSpends.source, marketingSpends.sourceLabel),
  ]);

  const grossRevenue = Number(summary?.grossRevenue ?? 0);
  const totalDiscounts = Number(summary?.totalDiscounts ?? 0);

  const marketingBreakdown = marketingRows.map((r) => ({
    source: r.source,
    sourceLabel: r.sourceLabel,
    totalAmountInCents: Number(r.totalAmountInCents),
  }));

  const pl = buildProfitAndLoss(
    grossRevenue,
    orgFixedCosts,
    orgVariableCosts,
    periodDays,
    revenueBySegment,
    totalDiscounts,
    marketingBreakdown
  );

  const totalMarketingSpendInCents = pl.marketingSpendInCents;
  const totalCostsInCents = pl.totalFixedCostsInCents + pl.totalVariableCostsInCents + totalMarketingSpendInCents;
  const impactPercent = grossRevenue > 0
    ? Math.round((totalCostsInCents / grossRevenue) * 10000) / 100
    : 0;

  return {
    grossRevenueInCents: grossRevenue,
    totalFixedCostsInCents: pl.totalFixedCostsInCents,
    totalVariableCostsInCents: pl.totalVariableCostsInCents,
    totalMarketingSpendInCents,
    totalCostsInCents,
    impactPercent,
    marginPercent: pl.marginPercent,
  };
}
