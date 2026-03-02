"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import dayjs from "dayjs";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { IMrrGrowthEntry } from "@/interfaces/mrr.interface";

function normalizeToMonthly(valueInCents: number, interval: string): number {
  if (interval === "yearly") return Math.round(valueInCents / 12);
  if (interval === "weekly") return Math.round(valueInCents * 4.33);
  return valueInCents;
}

export async function getMrrGrowth(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IMrrGrowthEntry[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const { startDate, endDate } = resolveDateRange(filter);

  const allSubs = await db
    .select()
    .from(subscriptions)
    .where(
      lte(subscriptions.startedAt, endDate)
    );

  const orgSubs = allSubs.filter((s) => s.organizationId === organizationId);

  const totalDays = dayjs(endDate).diff(dayjs(startDate), "day") + 1;
  const stepDays = totalDays <= 31 ? 1 : totalDays <= 90 ? 7 : 30;

  const entries: IMrrGrowthEntry[] = [];
  let cursor = dayjs(startDate);

  while (cursor.isBefore(dayjs(endDate).add(1, "day"))) {
    const pointDate = cursor.toDate();

    const mrr = orgSubs.reduce((sum, s) => {
      const isActive =
        s.startedAt <= pointDate &&
        (s.canceledAt === null || s.canceledAt > pointDate);
      return isActive ? sum + normalizeToMonthly(s.valueInCents, s.billingInterval) : sum;
    }, 0);

    entries.push({ date: cursor.format("YYYY-MM-DD"), mrr });
    cursor = cursor.add(stepDays, "day");
  }

  return entries;
}
