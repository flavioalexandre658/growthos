"use server";

import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { marketingSpends, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import dayjs from "@/utils/dayjs";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { IMarketingSpendSummary } from "@/interfaces/cost.interface";

export async function getMarketingSpendSummary(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IMarketingSpendSummary[]> {
  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(filter, tz);
  const startStr = dayjs(startDate).tz(tz).format("YYYY-MM-DD");
  const endStr = dayjs(endDate).tz(tz).format("YYYY-MM-DD");

  const rows = await db
    .select({
      source: marketingSpends.source,
      sourceLabel: marketingSpends.sourceLabel,
      totalAmountInCents: sql<number>`COALESCE(SUM(${marketingSpends.amountInCents}), 0)`,
    })
    .from(marketingSpends)
    .where(
      and(
        eq(marketingSpends.organizationId, organizationId),
        gte(marketingSpends.spentAt, startStr),
        lte(marketingSpends.spentAt, endStr)
      )
    )
    .groupBy(marketingSpends.source, marketingSpends.sourceLabel);

  return rows.map((r) => ({
    source: r.source,
    sourceLabel: r.sourceLabel,
    totalAmountInCents: Number(r.totalAmountInCents),
  }));
}
