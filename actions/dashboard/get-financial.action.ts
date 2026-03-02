"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type { IDateFilter, IFinancialData } from "@/interfaces/dashboard.interface";

export async function getFinancial(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IFinancialData | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const { startDate, endDate } = resolveDateRange(filter);

  const baseCondition = and(
    eq(events.organizationId, organizationId),
    gte(events.createdAt, startDate),
    lte(events.createdAt, endDate)
  );

  const [summary] = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
      netRevenue: sql<number>`COALESCE(SUM(${events.netValueInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
      totalGatewayFees: sql<number>`COALESCE(SUM(${events.gatewayFeeInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
      totalDiscounts: sql<number>`COALESCE(SUM(${events.discountInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
      lostRevenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'checkout_abandoned'), 0)`,
      totalPayments: sql<number>`COUNT(*) FILTER (WHERE ${events.eventType} = 'payment')`,
    })
    .from(events)
    .where(baseCondition);

  const grossRevenue = Number(summary?.grossRevenue ?? 0);
  const netRevenue = Number(summary?.netRevenue ?? 0);
  const totalGatewayFees = Number(summary?.totalGatewayFees ?? 0);
  const totalDiscounts = Number(summary?.totalDiscounts ?? 0);
  const lostRevenue = Number(summary?.lostRevenue ?? 0);
  const totalPayments = Number(summary?.totalPayments ?? 0);
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

  return {
    grossRevenueInCents: grossRevenue,
    netRevenueInCents: netRevenue,
    totalGatewayFeesInCents: totalGatewayFees,
    totalDiscountsInCents: totalDiscounts,
    lostRevenueInCents: lostRevenue,
    averageTicketInCents: averageTicket,
    totalPayments,
    byPaymentMethod,
    byCategory,
  };
}
