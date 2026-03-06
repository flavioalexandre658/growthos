"use server";

import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import dayjs from "@/utils/dayjs";
import type { IPublicRevenueEntry } from "@/interfaces/public-page.interface";

export async function getPublicRevenueHistory(
  organizationId: string,
  months: number = 12,
): Promise<IPublicRevenueEntry[]> {
  const now = dayjs();
  const start = now.subtract(months - 1, "month").startOf("month").toDate();
  const end = now.endOf("month").toDate();

  const rows = await db
    .select({
      month: sql<string>`TO_CHAR(${payments.createdAt}, 'YYYY-MM-01')`,
      revenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        inArray(payments.eventType, [...REVENUE_EVENT_TYPES]),
        gte(payments.createdAt, start),
        lte(payments.createdAt, end),
      ),
    )
    .groupBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM-01')`)
    .orderBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM-01')`);

  const result: IPublicRevenueEntry[] = [];
  for (let i = 0; i < months; i++) {
    const date = now.subtract(months - 1 - i, "month").format("YYYY-MM-01");
    const match = rows.find((r) => r.month === date);
    result.push({
      date,
      revenue: Number(match?.revenue ?? 0),
    });
  }

  return result;
}
