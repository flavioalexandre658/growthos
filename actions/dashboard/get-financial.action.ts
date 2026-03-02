"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, fixedCosts, variableCosts } from "@/db/schema";
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

  const { startDate, endDate } = resolveDateRange(filter);
  const periodDays = resolvePeriodDays(filter);

  const baseCondition = and(
    eq(events.organizationId, organizationId),
    gte(events.createdAt, startDate),
    lte(events.createdAt, endDate)
  );

  const [summary] = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
      totalDiscounts: sql<number>`COALESCE(SUM(${events.discountInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
      lostRevenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'checkout_abandoned'), 0)`,
      totalPayments: sql<number>`COUNT(*) FILTER (WHERE ${events.eventType} = 'payment')`,
      recurringRevenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'payment' AND ${events.billingType} = 'recurring'), 0)`,
      oneTimeRevenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'payment' AND (${events.billingType} != 'recurring' OR ${events.billingType} IS NULL)), 0)`,
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
      revenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}), 0)`,
    })
    .from(events)
    .where(
      and(
        baseCondition,
        eq(events.eventType, "payment")
      )
    )
    .groupBy(sql`COALESCE(${events.paymentMethod}, 'unknown')`)
    .orderBy(sql`COALESCE(SUM(${events.grossValueInCents}), 0) DESC`);

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
      revenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}), 0)`,
    })
    .from(events)
    .where(
      and(
        baseCondition,
        eq(events.eventType, "payment")
      )
    )
    .groupBy(sql`COALESCE(${events.category}, 'sem categoria')`)
    .orderBy(sql`COALESCE(SUM(${events.grossValueInCents}), 0) DESC`);

  const byCategory = categoryRows.map((row) => ({
    category: row.category,
    payments: Number(row.payments),
    revenue: Number(row.revenue),
    percentage: grossRevenue > 0
      ? ((Number(row.revenue) / grossRevenue) * 100).toFixed(1) + "%"
      : "0%",
  }));

  const segmentRows = await db
    .select({
      paymentMethod: events.paymentMethod,
      billingType: events.billingType,
      revenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}), 0)`,
    })
    .from(events)
    .where(
      and(
        baseCondition,
        eq(events.eventType, "payment")
      )
    )
    .groupBy(events.paymentMethod, events.billingType);

  const revenueBySegment: IRevenueBySegment = { paymentMethod: {}, billingType: {} };
  for (const row of segmentRows) {
    const rev = Number(row.revenue);
    if (row.paymentMethod) {
      revenueBySegment.paymentMethod[row.paymentMethod] = (revenueBySegment.paymentMethod[row.paymentMethod] ?? 0) + rev;
    }
    if (row.billingType) {
      revenueBySegment.billingType[row.billingType] = (revenueBySegment.billingType[row.billingType] ?? 0) + rev;
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
  };
}
