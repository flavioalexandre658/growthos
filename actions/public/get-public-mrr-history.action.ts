"use server";

import { eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { normalizeToMonthly } from "@/utils/billing";
import dayjs from "@/utils/dayjs";

export interface IPublicMrrHistoryEntry {
  date: string;
  mrr: number;
}

export async function getPublicMrrHistory(
  organizationId: string,
  months = 12,
): Promise<IPublicMrrHistoryEntry[]> {
  const endDate = dayjs().endOf("month").toDate();

  const allSubs = await db
    .select()
    .from(subscriptions)
    .where(lte(subscriptions.startedAt, endDate));

  const orgSubs = allSubs.filter((s) => s.organizationId === organizationId);

  const entries: IPublicMrrHistoryEntry[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const pointDate = dayjs().subtract(i, "month").endOf("month").toDate();

    const mrr = orgSubs.reduce((sum, s) => {
      const isActive =
        s.startedAt <= pointDate &&
        (s.canceledAt === null || s.canceledAt > pointDate);
      return isActive
        ? sum +
            normalizeToMonthly(
              s.baseValueInCents ?? s.valueInCents,
              s.billingInterval,
            )
        : sum;
    }, 0);

    entries.push({
      date: dayjs().subtract(i, "month").format("YYYY-MM"),
      mrr,
    });
  }

  return entries;
}
