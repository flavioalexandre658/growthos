"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { IRevenueBySegment } from "@/interfaces/cost.interface";

export async function getRevenueSegments(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IRevenueBySegment> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { paymentMethod: {}, billingType: {} };

  const { startDate, endDate } = resolveDateRange(filter);

  const rows = await db
    .select({
      paymentMethod: events.paymentMethod,
      billingType: events.billingType,
      revenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}), 0)`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "payment"),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate)
      )
    )
    .groupBy(events.paymentMethod, events.billingType);

  const paymentMethod: Record<string, number> = {};
  const billingType: Record<string, number> = {};

  for (const row of rows) {
    const revenue = Number(row.revenue);

    if (row.paymentMethod) {
      paymentMethod[row.paymentMethod] = (paymentMethod[row.paymentMethod] ?? 0) + revenue;
    }

    if (row.billingType) {
      billingType[row.billingType] = (billingType[row.billingType] ?? 0) + revenue;
    }
  }

  return { paymentMethod, billingType };
}
