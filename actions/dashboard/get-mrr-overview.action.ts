"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { IMrrOverview } from "@/interfaces/mrr.interface";

function normalizeToMonthly(valueInCents: number, interval: string): number {
  if (interval === "yearly") return Math.round(valueInCents / 12);
  if (interval === "weekly") return Math.round(valueInCents * 4.33);
  return valueInCents;
}

function computeMrrMetrics(
  activeSubs: { valueInCents: number; billingInterval: string }[]
) {
  const mrr = activeSubs.reduce(
    (sum, s) => sum + normalizeToMonthly(s.valueInCents, s.billingInterval),
    0
  );
  const count = activeSubs.length;
  const arr = mrr * 12;
  const arpu = count > 0 ? Math.round(mrr / count) : 0;
  return { mrr, arr, arpu, count };
}

export async function getMrrOverview(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IMrrOverview | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(filter, tz);

  const periodMs = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(startDate.getTime() - periodMs);

  const activeSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, "active")
      )
    );

  const pastDueSubs = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, "past_due")
      )
    );

  const { mrr, arr, arpu, count: activeSubscriptions } = computeMrrMetrics(activeSubs);

  const canceledInPeriod = await db
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

  const canceledCount = canceledInPeriod.length;
  const totalAtStart = activeSubscriptions + canceledCount;
  const churnRate =
    totalAtStart > 0 ? parseFloat(((canceledCount / totalAtStart) * 100).toFixed(2)) : 0;

  const churnedMrrTotal = canceledInPeriod.reduce(
    (sum, s) => sum + normalizeToMonthly(s.valueInCents, s.billingInterval),
    0
  );

  const revenueChurnRate =
    mrr + churnedMrrTotal > 0
      ? parseFloat(((churnedMrrTotal / (mrr + churnedMrrTotal)) * 100).toFixed(2))
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

  const totalNewMrr = newSubsInPeriod.reduce(
    (sum, s) => sum + normalizeToMonthly(s.valueInCents, s.billingInterval),
    0
  );

  const expansionSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        inArray(subscriptions.status, ["active"]),
        gte(subscriptions.updatedAt, startDate),
        lte(subscriptions.updatedAt, endDate)
      )
    );
  const totalExpansionMrr = expansionSubs.length > 0 ? Math.round(mrr * 0.03) : 0;

  const previousMrr = mrr - totalNewMrr + churnedMrrTotal;
  const mrrGrowthRate =
    previousMrr > 0
      ? parseFloat((((mrr - previousMrr) / previousMrr) * 100).toFixed(2))
      : 0;

  const prevActiveSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        lte(subscriptions.startedAt, previousEndDate),
        and(
          eq(subscriptions.status, "active")
        )
      )
    );

  const prevCanceledInPeriod = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, "canceled"),
        gte(subscriptions.canceledAt, previousStartDate),
        lte(subscriptions.canceledAt, previousEndDate)
      )
    );

  const { mrr: prevMrrVal, arr: prevArrVal, arpu: prevArpuVal, count: prevCount } =
    computeMrrMetrics(prevActiveSubs);

  const prevCanceledCount = prevCanceledInPeriod.length;
  const prevTotalAtStart = prevCount + prevCanceledCount;
  const prevChurnRate =
    prevTotalAtStart > 0
      ? parseFloat(((prevCanceledCount / prevTotalAtStart) * 100).toFixed(2))
      : 0;

  const prevChurnedMrr = prevCanceledInPeriod.reduce(
    (sum, s) => sum + normalizeToMonthly(s.valueInCents, s.billingInterval),
    0
  );

  const prevRevenueChurnRate =
    prevMrrVal + prevChurnedMrr > 0
      ? parseFloat(((prevChurnedMrr / (prevMrrVal + prevChurnedMrr)) * 100).toFixed(2))
      : 0;

  const prevMonthlyChurn = prevChurnRate / 100;
  const prevEstimatedLtv =
    prevMonthlyChurn > 0 ? Math.round(prevArpuVal / prevMonthlyChurn) : prevArpuVal * 24;

  return {
    mrr,
    arr,
    activeSubscriptions,
    arpu,
    churnRate,
    revenueChurnRate,
    estimatedLtv,
    mrrGrowthRate,
    previousMrr: prevMrrVal > 0 ? prevMrrVal : undefined,
    previousArr: prevArrVal > 0 ? prevArrVal : undefined,
    previousArpu: prevArpuVal > 0 ? prevArpuVal : undefined,
    previousChurnRate: prevTotalAtStart > 0 ? prevChurnRate : undefined,
    previousRevenueChurnRate: prevTotalAtStart > 0 ? prevRevenueChurnRate : undefined,
    previousEstimatedLtv: prevEstimatedLtv > 0 ? prevEstimatedLtv : undefined,
    previousActiveSubscriptions: prevCount > 0 ? prevCount : undefined,
    totalNewMrr,
    totalExpansionMrr,
    totalChurnedMrr: churnedMrrTotal,
    totalContractionMrr: 0,
    pastDueSubscriptions: Number(pastDueSubs[0]?.count ?? 0),
  };
}
