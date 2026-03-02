"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type {
  ILandingPageParams,
  ILandingPageData,
  IPaginatedResponse,
} from "@/interfaces/dashboard.interface";

export async function getLandingPages(
  organizationId: string,
  params: ILandingPageParams = {}
): Promise<IPaginatedResponse<ILandingPageData>> {
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
    lte(events.createdAt, endDate),
    sql`${events.landingPage} IS NOT NULL`
  );

  const orderExpr =
    orderBy === "revenue"
      ? sql`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`
      : orderBy === "payments"
      ? sql`COUNT(*) FILTER (WHERE ${events.eventType} = 'payment')`
      : orderBy === "pageviews"
      ? sql`COUNT(*) FILTER (WHERE ${events.eventType} = 'pageview')`
      : orderBy === "conversion_rate"
      ? sql`COUNT(*) FILTER (WHERE ${events.eventType} = 'payment')`
      : sql`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`;

  const rows = await db
    .select({
      page: events.landingPage,
      pageviews: sql<number>`COUNT(*) FILTER (WHERE ${events.eventType} = 'pageview')`,
      signups: sql<number>`COUNT(*) FILTER (WHERE ${events.eventType} = 'signup')`,
      payments: sql<number>`COUNT(*) FILTER (WHERE ${events.eventType} = 'payment')`,
      revenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}) FILTER (WHERE ${events.eventType} = 'payment'), 0)`,
    })
    .from(events)
    .where(baseCondition)
    .groupBy(events.landingPage)
    .orderBy(orderDir === "DESC" ? desc(orderExpr) : asc(orderExpr))
    .limit(limit)
    .offset(offset);

  const totalRows = await db
    .select({ total: sql<number>`COUNT(DISTINCT ${events.landingPage})` })
    .from(events)
    .where(baseCondition);

  const total = Number(totalRows[0]?.total ?? 0);

  const data: ILandingPageData[] = rows
    .filter((row) => row.page !== null)
    .map((row) => {
      const paymentsNum = Number(row.payments);
      const signupsNum = Number(row.signups);
      const conversionRate = signupsNum > 0
        ? ((paymentsNum / signupsNum) * 100).toFixed(1) + "%"
        : "0%";

      return {
        page: row.page as string,
        pageviews: Number(row.pageviews),
        signups: signupsNum,
        payments: paymentsNum,
        revenue: Number(row.revenue),
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
