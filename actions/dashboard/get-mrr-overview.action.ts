"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, organizations, events } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import { normalizeToMonthly } from "@/utils/billing";
import dayjs from "@/utils/dayjs";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { IMrrOverview } from "@/interfaces/mrr.interface";

function computeMrrMetrics(
  activeSubs: { valueInCents: number; baseValueInCents: number | null; billingInterval: string }[]
) {
  const mrr = activeSubs.reduce(
    (sum, s) => sum + normalizeToMonthly(s.baseValueInCents ?? s.valueInCents, s.billingInterval),
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
    (sum, s) => sum + normalizeToMonthly(s.baseValueInCents ?? s.valueInCents, s.billingInterval),
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
    (sum, s) => sum + normalizeToMonthly(s.baseValueInCents ?? s.valueInCents, s.billingInterval),
    0
  );

  const newSubIds = new Set(newSubsInPeriod.map((s) => s.subscriptionId));

  const paymentEventsInPeriod = await db
    .select({
      subscriptionId: events.subscriptionId,
      grossValueInCents: events.grossValueInCents,
      baseGrossValueInCents: events.baseGrossValueInCents,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "payment"),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate),
        inArray(events.billingType, ["recurring"])
      )
    );

  const totalPeriodRevenue = paymentEventsInPeriod.reduce(
    (sum, e) => sum + (e.baseGrossValueInCents ?? e.grossValueInCents ?? 0),
    0
  );
  const totalPaymentCount = paymentEventsInPeriod.length;

  const prevPaymentEvents = await db
    .select({
      grossValueInCents: events.grossValueInCents,
      baseGrossValueInCents: events.baseGrossValueInCents,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "payment"),
        gte(events.createdAt, previousStartDate),
        lte(events.createdAt, previousEndDate),
        inArray(events.billingType, ["recurring"])
      )
    );

  const previousPeriodRevenue = prevPaymentEvents.reduce(
    (sum, e) => sum + (e.baseGrossValueInCents ?? e.grossValueInCents ?? 0),
    0
  );

  const renewingSubIds = new Set(
    paymentEventsInPeriod
      .map((e) => e.subscriptionId)
      .filter((id): id is string => !!id && !newSubIds.has(id))
  );

  const renewalSubscriptions = renewingSubIds.size;

  const changedEvents = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "subscription_changed"),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate)
      )
    );

  let totalExpansionMrr = 0;
  let totalContractionMrr = 0;

  for (const ev of changedEvents) {
    const meta = ev.metadata as { previousValue?: number; newValue?: number } | null;
    if (!meta) continue;
    const prev = normalizeToMonthly(meta.previousValue ?? 0, ev.billingInterval ?? "monthly");
    const next = normalizeToMonthly(meta.newValue ?? 0, ev.billingInterval ?? "monthly");
    const delta = next - prev;
    if (delta > 0) totalExpansionMrr += delta;
    else if (delta < 0) totalContractionMrr += Math.abs(delta);
  }

  const previousMrr = mrr - totalNewMrr - totalExpansionMrr + totalContractionMrr + churnedMrrTotal;
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
        eq(subscriptions.status, "active")
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
    (sum, s) => sum + normalizeToMonthly(s.baseValueInCents ?? s.valueInCents, s.billingInterval),
    0
  );

  const prevRevenueChurnRate =
    prevMrrVal + prevChurnedMrr > 0
      ? parseFloat(((prevChurnedMrr / (prevMrrVal + prevChurnedMrr)) * 100).toFixed(2))
      : 0;

  const prevMonthlyChurn = prevChurnRate / 100;
  const prevEstimatedLtv =
    prevMonthlyChurn > 0 ? Math.round(prevArpuVal / prevMonthlyChurn) : prevArpuVal * 24;

  const nrr =
    previousMrr > 0
      ? parseFloat((((mrr - totalNewMrr) / previousMrr) * 100).toFixed(1))
      : 0;

  const prevNewMrrForNrr = (() => {
    const prevPeriodMs = previousEndDate.getTime() - previousStartDate.getTime();
    return 0;
  })();

  const prevNrrBase = prevMrrVal > 0 ? prevMrrVal : 0;
  const previousNrr =
    prevNrrBase > 0
      ? parseFloat((((prevMrrVal - prevNewMrrForNrr) / prevNrrBase) * 100).toFixed(1))
      : undefined;

  const now = dayjs();
  const in30Days = now.add(30, "day");

  function computeNextBillingAt(startedAt: Date, interval: string): Date | null {
    const start = dayjs(startedAt);
    if (!start.isValid()) return null;
    const monthsMap: Record<string, number> = {
      monthly: 1,
      quarterly: 3,
      semiannual: 6,
      yearly: 12,
    };
    if (interval === "weekly") {
      let next = start;
      while (next.isBefore(now) || next.isSame(now, "day")) next = next.add(1, "week");
      return next.toDate();
    }
    const months = monthsMap[interval] ?? 1;
    let next = start;
    while (next.isBefore(now) || next.isSame(now, "day")) next = next.add(months, "month");
    return next.toDate();
  }

  let forecastNext30dRevenue = 0;
  let forecastNext30dCount = 0;

  for (const sub of activeSubs) {
    const next = computeNextBillingAt(sub.startedAt, sub.billingInterval);
    if (!next) continue;
    const nextDay = dayjs(next);
    if (nextDay.isAfter(now) && (nextDay.isBefore(in30Days) || nextDay.isSame(in30Days, "day"))) {
      forecastNext30dRevenue += sub.baseValueInCents ?? sub.valueInCents;
      forecastNext30dCount++;
    }
  }

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
    totalContractionMrr,
    totalChurnedMrr: churnedMrrTotal,
    pastDueSubscriptions: Number(pastDueSubs[0]?.count ?? 0),
    newSubscriptions: newSubsInPeriod.length,
    churnedSubscriptions: canceledCount,
    renewalSubscriptions,
    totalPeriodRevenue,
    totalPaymentCount,
    previousPeriodRevenue: previousPeriodRevenue > 0 ? previousPeriodRevenue : undefined,
    nrr,
    previousNrr,
    forecastNext30dRevenue,
    forecastNext30dCount,
  };
}
