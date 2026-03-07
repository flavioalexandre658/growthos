"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import { db } from "@/db";
import { payments, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import { getUserPlan } from "@/utils/get-user-plan";
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
  const plan = await getUserPlan();
  const { startDate, endDate } = resolveDateRange(filter, tz, plan.maxHistoryDays);

  const rows = await db
    .select({
      paymentMethod: payments.paymentMethod,
      billingType: payments.billingType,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        inArray(payments.eventType, REVENUE_EVENT_TYPES),
        gte(payments.createdAt, startDate),
        lte(payments.createdAt, endDate)
      )
    )
    .groupBy(payments.paymentMethod, payments.billingType);

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
