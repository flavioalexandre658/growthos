"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { IMrrOverview } from "@/interfaces/mrr.interface";

function normalizeToMonthly(valueInCents: number, interval: string): number {
  if (interval === "yearly") return Math.round(valueInCents / 12);
  if (interval === "weekly") return Math.round(valueInCents * 4.33);
  return valueInCents;
}

export async function getMrrOverview(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IMrrOverview | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const { startDate, endDate } = resolveDateRange(filter);

  const activeSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, "active")
      )
    );

  const mrr = activeSubs.reduce(
    (sum, s) => sum + normalizeToMonthly(s.valueInCents, s.billingInterval),
    0
  );

  const activeSubscriptions = activeSubs.length;
  const arr = mrr * 12;
  const arpu = activeSubscriptions > 0 ? Math.round(mrr / activeSubscriptions) : 0;

  const canceledInPeriod = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, "canceled"),
        gte(subscriptions.canceledAt, startDate),
        lte(subscriptions.canceledAt, endDate)
      )
    );

  const canceledCount = Number(canceledInPeriod[0]?.count ?? 0);
  const totalAtStart = activeSubscriptions + canceledCount;
  const churnRate =
    totalAtStart > 0 ? parseFloat(((canceledCount / totalAtStart) * 100).toFixed(2)) : 0;

  const canceledSubsInPeriod = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, "canceled"),
        gte(subscriptions.canceledAt, startDate),
        lte(subscriptions.canceledAt, endDate)
      )
    );

  const churnedMrr = canceledSubsInPeriod.reduce(
    (sum, s) => sum + normalizeToMonthly(s.valueInCents, s.billingInterval),
    0
  );

  const revenueChurnRate =
    mrr + churnedMrr > 0
      ? parseFloat(((churnedMrr / (mrr + churnedMrr)) * 100).toFixed(2))
      : 0;

  const monthlyChurnDecimal = churnRate / 100;
  const estimatedLtv =
    monthlyChurnDecimal > 0 ? Math.round(arpu / monthlyChurnDecimal) : arpu * 24;

  const newSubsInPeriod = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        gte(subscriptions.startedAt, startDate),
        lte(subscriptions.startedAt, endDate)
      )
    );

  const newMrr = newSubsInPeriod.reduce(
    (sum, s) => sum + normalizeToMonthly(s.valueInCents, s.billingInterval),
    0
  );

  const previousMrr = mrr - newMrr + churnedMrr;
  const mrrGrowthRate =
    previousMrr > 0
      ? parseFloat((((mrr - previousMrr) / previousMrr) * 100).toFixed(2))
      : 0;

  return {
    mrr,
    arr,
    activeSubscriptions,
    arpu,
    churnRate,
    revenueChurnRate,
    estimatedLtv,
    mrrGrowthRate,
  };
}
