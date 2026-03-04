"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { events, fixedCosts, variableCosts, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import { resolvePeriodDays } from "@/utils/resolve-period-days";
import { buildProfitAndLoss } from "@/utils/build-pl";
import type { IDateFilter, IFinancialData } from "@/interfaces/dashboard.interface";
import type { IRevenueBySegment } from "@/interfaces/cost.interface";

export async function getFinancial(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IFinancialData | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(filter, tz);
  const periodDays = resolvePeriodDays(filter, tz);

  const periodMs = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(startDate.getTime() - periodMs);

  const baseCondition = and(
    eq(events.organizationId, organizationId),
    gte(events.createdAt, startDate),
    lte(events.createdAt, endDate)
  );

  const [summary] = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
      totalDiscounts: sql<number>`COALESCE(SUM(${events.discountInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
      lostRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})) FILTER (WHERE ${events.eventType} = 'checkout_abandoned'), 0)`,
      totalPayments: sql<number>`COUNT(*) FILTER (WHERE ${events.eventType} = 'payment')`,
      recurringRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})) FILTER (WHERE ${events.eventType} = 'payment' AND ${events.billingType} = 'recurring'), 0)`,
      oneTimeRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})) FILTER (WHERE ${events.eventType} = 'payment' AND (${events.billingType} != 'recurring' OR ${events.billingType} IS NULL)), 0)`,
    })
    .from(events)
    .where(baseCondition);

  const grossRevenue = Number(summary?.grossRevenue ?? 0);
  const totalDiscounts = Number(summary?.totalDiscounts ?? 0);
  const lostRevenue = Number(summary?.lostRevenue ?? 0);
  const totalPayments = Number(summary?.totalPayments ?? 0);
  const recurringRevenue = Number(summary?.recurringRevenue ?? 0);
  const oneTimeRevenue = Number(summary?.oneTimeRevenue ?? 0);
  const averageTicket = totalPayments > 0 ? Math.round(grossRevenue / totalPayments) : 0;

  const methodRows = await db
    .select({
      method: sql<string>`COALESCE(${events.paymentMethod}, 'unknown')`,
      payments: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)`,
    })
    .from(events)
    .where(
      and(
        baseCondition,
        eq(events.eventType, "payment")
      )
    )
    .groupBy(sql`COALESCE(${events.paymentMethod}, 'unknown')`)
    .orderBy(sql`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0) DESC`);

  const byPaymentMethod = methodRows.map((row) => ({
    method: row.method,
    payments: Number(row.payments),
    revenue: Number(row.revenue),
    percentage: grossRevenue > 0
      ? ((Number(row.revenue) / grossRevenue) * 100).toFixed(1) + "%"
      : "0%",
  }));

  const categoryRows = await db
    .select({
      category: sql<string>`COALESCE(${events.category}, 'sem categoria')`,
      payments: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)`,
    })
    .from(events)
    .where(
      and(
        baseCondition,
        eq(events.eventType, "payment")
      )
    )
    .groupBy(sql`COALESCE(${events.category}, 'sem categoria')`)
    .orderBy(sql`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0) DESC`);

  const totalVariableCostRate = grossRevenue > 0
    ? (await db
        .select({ rate: sql<number>`COALESCE(SUM(${variableCosts.amountInCents}), 0)` })
        .from(variableCosts)
        .where(and(eq(variableCosts.organizationId, organizationId), eq(variableCosts.type, "PERCENTAGE")))
        .then((r) => Number(r[0]?.rate ?? 0) / 100))
    : 0;

  const byCategory = categoryRows.map((row) => {
    const rev = Number(row.revenue);
    const variableCostForCategory = rev * (totalVariableCostRate / 100);
    const estimatedMargin = rev > 0 ? ((rev - variableCostForCategory) / rev) * 100 : 0;
    return {
      category: row.category,
      payments: Number(row.payments),
      revenue: rev,
      percentage: grossRevenue > 0
        ? ((rev / grossRevenue) * 100).toFixed(1) + "%"
        : "0%",
      marginPercentage: `${estimatedMargin.toFixed(1)}%`,
    };
  });

  const segmentRows = await db
    .select({
      paymentMethod: events.paymentMethod,
      billingType: events.billingType,
      category: events.category,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)`,
    })
    .from(events)
    .where(
      and(
        baseCondition,
        eq(events.eventType, "payment")
      )
    )
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

  const eventCosts = totalDiscounts;
  const pl = buildProfitAndLoss(
    grossRevenue,
    orgFixedCosts,
    orgVariableCosts,
    periodDays,
    revenueBySegment,
    eventCosts
  );

  const prevBaseCondition = and(
    eq(events.organizationId, organizationId),
    gte(events.createdAt, previousStartDate),
    lte(events.createdAt, previousEndDate)
  );

  const [prevSummary] = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
      lostRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})) FILTER (WHERE ${events.eventType} = 'checkout_abandoned'), 0)`,
      totalPayments: sql<number>`COUNT(*) FILTER (WHERE ${events.eventType} = 'payment')`,
      recurringRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})) FILTER (WHERE ${events.eventType} = 'payment' AND ${events.billingType} = 'recurring'), 0)`,
      oneTimeRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})) FILTER (WHERE ${events.eventType} = 'payment' AND (${events.billingType} != 'recurring' OR ${events.billingType} IS NULL)), 0)`,
      totalDiscounts: sql<number>`COALESCE(SUM(${events.discountInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
    })
    .from(events)
    .where(prevBaseCondition);

  const prevGrossRevenue = Number(prevSummary?.grossRevenue ?? 0);
  const prevTotalPayments = Number(prevSummary?.totalPayments ?? 0);
  const prevAverageTicket = prevTotalPayments > 0 ? Math.round(prevGrossRevenue / prevTotalPayments) : 0;
  const prevLostRevenue = Number(prevSummary?.lostRevenue ?? 0);
  const prevRecurringRevenue = Number(prevSummary?.recurringRevenue ?? 0);
  const prevOneTimeRevenue = Number(prevSummary?.oneTimeRevenue ?? 0);

  const prevPl = buildProfitAndLoss(
    prevGrossRevenue,
    orgFixedCosts,
    orgVariableCosts,
    periodDays,
    { paymentMethod: {}, billingType: {} },
    Number(prevSummary?.totalDiscounts ?? 0)
  );

  return {
    grossRevenueInCents: grossRevenue,
    totalDiscountsInCents: totalDiscounts,
    lostRevenueInCents: lostRevenue,
    averageTicketInCents: averageTicket,
    totalPayments,
    byPaymentMethod,
    byCategory,
    revenueByBillingType: { recurring: recurringRevenue, oneTime: oneTimeRevenue },
    pl,
    periodDays,
    previousGrossRevenueInCents: prevGrossRevenue,
    previousTotalPayments: prevTotalPayments,
    previousAverageTicketInCents: prevAverageTicket,
    previousLostRevenueInCents: prevLostRevenue,
    previousNetProfitInCents: prevPl?.netProfitInCents ?? 0,
    previousMarginPercent: prevPl?.marginPercent ?? 0,
    previousRecurringRevenueInCents: prevRecurringRevenue,
    previousOneTimeRevenueInCents: prevOneTimeRevenue,
  };
}
