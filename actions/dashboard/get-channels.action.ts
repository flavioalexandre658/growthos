"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type {
  IDateFilter,
  IChannelParams,
  IChannelData,
  IPaginatedResponse,
} from "@/interfaces/dashboard.interface";

export async function getChannels(
  organizationId: string,
  params: IChannelParams = {}
): Promise<IPaginatedResponse<IChannelData>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { data: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } };

  const { startDate, endDate } = resolveDateRange(params);
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;
  const orderDir = params.order_dir ?? "DESC";
  const orderBy = params.order_by ?? "revenue";

  const baseCondition = and(
    eq(events.organizationId, organizationId),
    gte(events.createdAt, startDate),
    lte(events.createdAt, endDate)
  );

  const rows = await db
    .select({
      channel: sql<string>`COALESCE(${events.source}, 'direct')`,
      signups: sql<number>`COUNT(*) FILTER (WHERE ${events.eventType} = 'signup')`,
      payments: sql<number>`COUNT(*) FILTER (WHERE ${events.eventType} = 'payment')`,
      revenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
    })
    .from(events)
    .where(baseCondition)
    .groupBy(sql`COALESCE(${events.source}, 'direct')`)
    .orderBy(
      orderDir === "DESC"
        ? desc(sql`${orderBy === "revenue" ? sql`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)` : orderBy === "payments" ? sql`COUNT(*) FILTER (WHERE ${events.eventType} = 'payment')` : sql`COUNT(*) FILTER (WHERE ${events.eventType} = 'signup')`}`)
        : asc(sql`${orderBy === "revenue" ? sql`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)` : orderBy === "payments" ? sql`COUNT(*) FILTER (WHERE ${events.eventType} = 'payment')` : sql`COUNT(*) FILTER (WHERE ${events.eventType} = 'signup')`}`)
    )
    .limit(limit)
    .offset(offset);

  const totalRows = await db
    .select({ total: sql<number>`COUNT(DISTINCT COALESCE(${events.source}, 'direct'))` })
    .from(events)
    .where(baseCondition);

  const total = Number(totalRows[0]?.total ?? 0);

  const data: IChannelData[] = rows.map((row) => {
    const paymentsNum = Number(row.payments);
    const revenueNum = Number(row.revenue);
    const signupsNum = Number(row.signups);
    const ticketMedio = paymentsNum > 0 ? revenueNum / paymentsNum : 0;
    const conversionRate = signupsNum > 0
      ? ((paymentsNum / signupsNum) * 100).toFixed(1) + "%"
      : "0%";

    return {
      channel: row.channel,
      signups: signupsNum,
      payments: paymentsNum,
      revenue: revenueNum,
      ticket_medio: ticketMedio,
      conversion_rate: conversionRate,
    };
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}
