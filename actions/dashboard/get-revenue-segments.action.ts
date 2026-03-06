"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { IRevenueBySegment } from "@/interfaces/cost.interface";

export async function getRevenueSegments(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IRevenueBySegment> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { paymentMethod: {}, billingType: {} };

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(filter, tz);

  const rows = await db
    .select({
      paymentMethod: events.paymentMethod,
      billingType: events.billingType,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        inArray(events.eventType, REVENUE_EVENT_TYPES),
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

    const effectiveBillingType = row.billingType ?? "one_time";
    billingType[effectiveBillingType] = (billingType[effectiveBillingType] ?? 0) + revenue;
  }

  return { paymentMethod, billingType };
}
