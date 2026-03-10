"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, organizations } from "@/db/schema";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import { resolveDateRange } from "@/utils/resolve-date-range";
import { getUserPlan } from "@/utils/get-user-plan";
import type { IDateFilter, ICampaignData } from "@/interfaces/dashboard.interface";
import dayjs from "@/utils/dayjs";

export async function getTopCampaigns(
  organizationId: string,
  params: IDateFilter = {},
  limit = 10
): Promise<ICampaignData[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const plan = await getUserPlan();
  const { startDate, endDate } = resolveDateRange(params, tz, plan.maxHistoryDays);

  const rows = await db
    .select({
      campaign: payments.campaign,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
      purchases: sql<number>`COUNT(*)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        gte(payments.createdAt, startDate),
        lte(payments.createdAt, endDate),
        inArray(payments.eventType, REVENUE_EVENT_TYPES),
        isNotNull(payments.campaign),
        sql`${payments.campaign} <> ''`
      )
    )
    .groupBy(payments.campaign)
    .orderBy(sql`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0) DESC`)
    .limit(limit);

  return rows.map((r) => ({
    campaign: r.campaign!,
    revenue: Number(r.revenue),
    purchases: Number(r.purchases),
  }));
}
