"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";

import { db } from "@/db";
import { events, payments, fixedCosts, variableCosts, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import { getUserPlan } from "@/utils/get-user-plan";
import { resolvePeriodDays } from "@/utils/resolve-period-days";
import { buildProfitAndLoss } from "@/utils/build-pl";
import { reconcilePayments } from "@/utils/reconcile-payments";
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
  const plan = await getUserPlan();
  const { startDate, endDate } = resolveDateRange(filter, tz, plan.maxHistoryDays);
  const periodDays = resolvePeriodDays(filter, tz);

  const periodMs = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(startDate.getTime() - periodMs);

  const paymentsCondition = and(
    eq(payments.organizationId, organizationId),
    gte(payments.createdAt, startDate),
    lte(payments.createdAt, endDate)
  );

  const eventsCondition = and(
    eq(events.organizationId, organizationId),
    gte(events.createdAt, startDate),
    lte(events.createdAt, endDate)
  );

  await reconcilePayments(organizationId).catch((err) =>
    console.error("[reconcile] get-financial", err)
  );

  const [summary] = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})) FILTER (WHERE ${payments.eventType} IN ('purchase', 'renewal')), 0)`,
      totalDiscounts: sql<number>`COALESCE(SUM(${payments.discountInCents}) FILTER (WHERE ${payments.eventType} IN ('purchase', 'renewal')), 0)`,
      totalPurchases: sql<number>`COUNT(*) FILTER (WHERE ${payments.eventType} IN ('purchase', 'renewal'))`,
      recurringRevenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})) FILTER (WHERE ${payments.eventType} IN ('purchase', 'renewal') AND ${payments.billingType} = 'recurring'), 0)`,
      oneTimeRevenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})) FILTER (WHERE ${payments.eventType} IN ('purchase', 'renewal') AND (${payments.billingType} != 'recurring' OR ${payments.billingType} IS NULL)), 0)`,
    })
    .from(payments)
    .where(paymentsCondition);

  const [lostRevenueRow] = await db
    .select({
      lostRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)`,
    })
    .from(events)
    .where(
      and(eventsCondition, eq(events.eventType, "checkout_abandoned"))
    );

  const grossRevenue = Number(summary?.grossRevenue ?? 0);
  const totalDiscounts = Number(summary?.totalDiscounts ?? 0);
  const lostRevenue = Number(lostRevenueRow?.lostRevenue ?? 0);
  const totalPurchases = Number(summary?.totalPurchases ?? 0);
  const recurringRevenue = Number(summary?.recurringRevenue ?? 0);
  const oneTimeRevenue = Number(summary?.oneTimeRevenue ?? 0);
  const averageTicket = totalPurchases > 0 ? Math.round(grossRevenue / totalPurchases) : 0;

  const methodRows = await db
    .select({
      method: sql<string>`COALESCE(${payments.paymentMethod}, 'unknown')`,
      paymentsCount: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
    })
    .from(payments)
    .where(
      and(
        paymentsCondition,
        inArray(payments.eventType, REVENUE_EVENT_TYPES)
      )
    )
    .groupBy(sql`COALESCE(${payments.paymentMethod}, 'unknown')`)
    .orderBy(sql`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0) DESC`);

  const byPaymentMethod = methodRows.map((row) => ({
    method: row.method,
    purchases: Number(row.paymentsCount),
    revenue: Number(row.revenue),
    percentage: grossRevenue > 0
      ? ((Number(row.revenue) / grossRevenue) * 100).toFixed(1) + "%"
      : "0%",
  }));

  const categoryRows = await db
    .select({
      category: sql<string>`COALESCE(${payments.category}, 'sem categoria')`,
      paymentsCount: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
    })
    .from(payments)
    .where(
      and(
        paymentsCondition,
        inArray(payments.eventType, REVENUE_EVENT_TYPES)
      )
    )
    .groupBy(sql`COALESCE(${payments.category}, 'sem categoria')`)
    .orderBy(sql`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0) DESC`);

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
      purchases: Number(row.paymentsCount),
      revenue: rev,
      percentage: grossRevenue > 0
        ? ((rev / grossRevenue) * 100).toFixed(1) + "%"
        : "0%",
      marginPercentage: `${estimatedMargin.toFixed(1)}%`,
    };
  });

  const segmentRows = await db
    .select({
      paymentMethod: payments.paymentMethod,
      billingType: payments.billingType,
      category: payments.category,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
    })
    .from(payments)
    .where(
      and(
        paymentsCondition,
        inArray(payments.eventType, REVENUE_EVENT_TYPES)
      )
    )
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

  const prevPaymentsCondition = and(
    eq(payments.organizationId, organizationId),
    gte(payments.createdAt, previousStartDate),
    lte(payments.createdAt, previousEndDate)
  );

  const prevEventsCondition = and(
    eq(events.organizationId, organizationId),
    gte(events.createdAt, previousStartDate),
    lte(events.createdAt, previousEndDate)
  );

  const [prevSummary] = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})) FILTER (WHERE ${payments.eventType} IN ('purchase', 'renewal')), 0)`,
      totalPurchases: sql<number>`COUNT(*) FILTER (WHERE ${payments.eventType} IN ('purchase', 'renewal'))`,
      recurringRevenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})) FILTER (WHERE ${payments.eventType} IN ('purchase', 'renewal') AND ${payments.billingType} = 'recurring'), 0)`,
      oneTimeRevenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})) FILTER (WHERE ${payments.eventType} IN ('purchase', 'renewal') AND (${payments.billingType} != 'recurring' OR ${payments.billingType} IS NULL)), 0)`,
      totalDiscounts: sql<number>`COALESCE(SUM(${payments.discountInCents}) FILTER (WHERE ${payments.eventType} IN ('purchase', 'renewal')), 0)`,
    })
    .from(payments)
    .where(prevPaymentsCondition);

  const [prevLostRevenueRow] = await db
    .select({
      lostRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)`,
    })
    .from(events)
    .where(and(prevEventsCondition, eq(events.eventType, "checkout_abandoned")));

  const prevGrossRevenue = Number(prevSummary?.grossRevenue ?? 0);
  const prevTotalPurchases = Number(prevSummary?.totalPurchases ?? 0);
  const prevAverageTicket = prevTotalPurchases > 0 ? Math.round(prevGrossRevenue / prevTotalPurchases) : 0;
  const prevLostRevenue = Number(prevLostRevenueRow?.lostRevenue ?? 0);
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
    totalPurchases,
    byPaymentMethod,
    byCategory,
    revenueByBillingType: { recurring: recurringRevenue, oneTime: oneTimeRevenue },
    pl,
    periodDays,
    previousGrossRevenueInCents: prevGrossRevenue,
    previousTotalPurchases: prevTotalPurchases,
    previousAverageTicketInCents: prevAverageTicket,
    previousLostRevenueInCents: prevLostRevenue,
    previousNetProfitInCents: prevPl?.netProfitInCents ?? 0,
    previousMarginPercent: prevPl?.marginPercent ?? 0,
    previousRecurringRevenueInCents: prevRecurringRevenue,
    previousOneTimeRevenueInCents: prevOneTimeRevenue,
  };
}
