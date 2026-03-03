"use server";

import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, fixedCosts, variableCosts, organizations } from "@/db/schema";
import { buildProfitAndLoss } from "@/utils/build-pl";
import { resolvePeriodDays } from "@/utils/resolve-period-days";
import { resolveDateRange } from "@/utils/resolve-date-range";
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

  const baseCondition = and(
    eq(events.organizationId, organizationId),
    gte(events.createdAt, startDate),
    lte(events.createdAt, endDate)
  );

  const [summary] = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
      totalDiscounts: sql<number>`COALESCE(SUM(${events.discountInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
    })
    .from(events)
    .where(baseCondition);

  const segmentRows = await db
    .select({
      paymentMethod: events.paymentMethod,
      billingType: events.billingType,
      category: events.category,
      revenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}), 0)`,
    })
    .from(events)
    .where(and(baseCondition, eq(events.eventType, "payment")))
    .groupBy(events.paymentMethod, events.billingType, events.category);

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

  const [orgFixedCosts, orgVariableCosts] = await Promise.all([
    db.select().from(fixedCosts).where(eq(fixedCosts.organizationId, organizationId)),
    db.select().from(variableCosts).where(eq(variableCosts.organizationId, organizationId)),
  ]);

  const grossRevenue = Number(summary?.grossRevenue ?? 0);
  const totalDiscounts = Number(summary?.totalDiscounts ?? 0);

  const pl = buildProfitAndLoss(
    grossRevenue,
    orgFixedCosts,
    orgVariableCosts,
    periodDays,
    revenueBySegment,
    totalDiscounts
  );

  const totalCostsInCents = pl.totalFixedCostsInCents + pl.totalVariableCostsInCents;
  const impactPercent = grossRevenue > 0
    ? Math.round((totalCostsInCents / grossRevenue) * 10000) / 100
    : 0;

  return {
    grossRevenueInCents: grossRevenue,
    totalFixedCostsInCents: pl.totalFixedCostsInCents,
    totalVariableCostsInCents: pl.totalVariableCostsInCents,
    totalCostsInCents,
    impactPercent,
    marginPercent: pl.marginPercent,
  };
}
