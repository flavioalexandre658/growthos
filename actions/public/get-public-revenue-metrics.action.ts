"use server";

import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import dayjs from "@/utils/dayjs";

export interface IPublicRevenueMetrics {
  monthlyRevenue: number;
  revenueGrowthRate: number;
  uniqueCustomers: number;
  ticketMedio: number;
  repurchaseRate: number;
  recurringRevenue: number;
  oneTimeRevenue: number;
}

export async function getPublicRevenueMetrics(
  organizationId: string,
): Promise<IPublicRevenueMetrics> {
  const now = dayjs();
  const currentStart = now.startOf("month").toDate();
  const currentEnd = now.endOf("month").toDate();
  const prevStart = now.subtract(1, "month").startOf("month").toDate();
  const prevEnd = now.subtract(1, "month").endOf("month").toDate();

  const baseWhere = (start: Date, end: Date) =>
    and(
      eq(events.organizationId, organizationId),
      inArray(events.eventType, [...REVENUE_EVENT_TYPES]),
      gte(events.createdAt, start),
      lte(events.createdAt, end),
    );

  const [currentSummary] = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)`,
      purchaseCount: sql<number>`COUNT(*)`,
      uniqueCustomers: sql<number>`COUNT(DISTINCT ${events.customerId})`,
      recurringRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})) FILTER (WHERE ${events.billingType} = 'recurring'), 0)`,
      oneTimeRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})) FILTER (WHERE ${events.billingType} != 'recurring' OR ${events.billingType} IS NULL), 0)`,
    })
    .from(events)
    .where(baseWhere(currentStart, currentEnd));

  const [prevSummary] = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)`,
    })
    .from(events)
    .where(baseWhere(prevStart, prevEnd));

  const monthlyRevenue = Number(currentSummary?.grossRevenue ?? 0);
  const prevRevenue = Number(prevSummary?.grossRevenue ?? 0);
  const purchaseCount = Number(currentSummary?.purchaseCount ?? 0);
  const uniqueCustomers = Number(currentSummary?.uniqueCustomers ?? 0);
  const recurringRevenue = Number(currentSummary?.recurringRevenue ?? 0);
  const oneTimeRevenue = Number(currentSummary?.oneTimeRevenue ?? 0);

  const revenueGrowthRate =
    prevRevenue > 0
      ? parseFloat((((monthlyRevenue - prevRevenue) / prevRevenue) * 100).toFixed(2))
      : 0;

  const ticketMedio = purchaseCount > 0 ? Math.round(monthlyRevenue / purchaseCount) : 0;

  const ninetyDaysAgo = now.subtract(90, "day").toDate();

  const [repurchaseData] = await db
    .select({
      totalCustomers: sql<number>`COUNT(DISTINCT ${events.customerId})`,
      repeatCustomers: sql<number>`COUNT(DISTINCT ${events.customerId}) FILTER (WHERE ${events.customerId} IN (
        SELECT ${events.customerId} FROM ${events}
        WHERE ${events.organizationId} = ${organizationId}
          AND ${events.eventType} IN ('purchase', 'renewal')
          AND ${events.createdAt} >= ${ninetyDaysAgo}
          AND ${events.createdAt} <= ${currentEnd}
          AND ${events.customerId} IS NOT NULL
        GROUP BY ${events.customerId}
        HAVING COUNT(*) > 1
      ))`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        inArray(events.eventType, [...REVENUE_EVENT_TYPES]),
        gte(events.createdAt, ninetyDaysAgo),
        lte(events.createdAt, currentEnd),
        sql`${events.customerId} IS NOT NULL`,
      ),
    );

  const totalCustomers = Number(repurchaseData?.totalCustomers ?? 0);
  const repeatCustomers = Number(repurchaseData?.repeatCustomers ?? 0);
  const repurchaseRate =
    totalCustomers > 0
      ? parseFloat(((repeatCustomers / totalCustomers) * 100).toFixed(1))
      : 0;

  return {
    monthlyRevenue,
    revenueGrowthRate,
    uniqueCustomers,
    ticketMedio,
    repurchaseRate,
    recurringRevenue,
    oneTimeRevenue,
  };
}
