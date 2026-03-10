"use server";

import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { marketingSpends, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import dayjs from "@/utils/dayjs";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { IMarketingSpend } from "@/interfaces/cost.interface";

export interface IGetMarketingSpendsParams extends IDateFilter {
  source?: string;
  page?: number;
  limit?: number;
}

export interface IGetMarketingSpendsResult {
  data: IMarketingSpend[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
  totalAmountInCents: number;
}

export async function getMarketingSpends(
  organizationId: string,
  params: IGetMarketingSpendsParams = {}
): Promise<IGetMarketingSpendsResult> {
  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(params, tz);
  const startStr = dayjs(startDate).tz(tz).format("YYYY-MM-DD");
  const endStr = dayjs(endDate).tz(tz).format("YYYY-MM-DD");
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;

  const baseCondition = and(
    eq(marketingSpends.organizationId, organizationId),
    gte(marketingSpends.spentAt, startStr),
    lte(marketingSpends.spentAt, endStr),
    ...(params.source ? [eq(marketingSpends.source, params.source)] : [])
  );

  const [rows, countRow, sumRow] = await Promise.all([
    db
      .select()
      .from(marketingSpends)
      .where(baseCondition)
      .orderBy(desc(marketingSpends.spentAt), desc(marketingSpends.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(marketingSpends)
      .where(baseCondition),
    db
      .select({ total: sql<number>`COALESCE(SUM(${marketingSpends.amountInCents}), 0)` })
      .from(marketingSpends)
      .where(baseCondition),
  ]);

  const total = Number(countRow[0]?.count ?? 0);

  return {
    data: rows as IMarketingSpend[],
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    totalAmountInCents: Number(sumRow[0]?.total ?? 0),
  };
}
