"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type { IDateFilter, IDailyData } from "@/interfaces/dashboard.interface";

export async function getDaily(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IDailyData[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const { startDate, endDate } = resolveDateRange(filter);

  const rows = await db
    .select({
      date: sql<string>`DATE(${events.createdAt})::text`,
      signups: sql<number>`COUNT(*) FILTER (WHERE ${events.eventType} = 'signup')`,
      payments: sql<number>`COUNT(*) FILTER (WHERE ${events.eventType} = 'payment')`,
      revenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
      net_revenue: sql<number>`COALESCE(SUM(${events.netValueInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate)
      )
    )
    .groupBy(sql`DATE(${events.createdAt})`)
    .orderBy(sql`DATE(${events.createdAt}) ASC`);

  return rows.map((row) => ({
    date: row.date,
    signups: Number(row.signups),
    payments: Number(row.payments),
    revenue: Number(row.revenue),
    net_revenue: Number(row.net_revenue),
  }));
}
