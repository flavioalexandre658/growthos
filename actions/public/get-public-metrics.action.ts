"use server";

import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, events } from "@/db/schema";
import { normalizeToMonthly } from "@/utils/billing";
import dayjs from "@/utils/dayjs";

export interface IPublicMetrics {
  mrr: number;
  activeSubscriptions: number;
  arpu: number;
  churnRate: number;
  mrrGrowthRate: number;
}

export async function getPublicMetrics(organizationId: string): Promise<IPublicMetrics> {
  const activeSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, "active"),
      ),
    );

  const mrr = activeSubs.reduce(
    (sum, s) =>
      sum +
      normalizeToMonthly(
        s.baseValueInCents ?? s.valueInCents,
        s.billingInterval,
      ),
    0,
  );
  const count = activeSubs.length;
  const arpu = count > 0 ? Math.round(mrr / count) : 0;

  const now = dayjs();
  const startDate = now.subtract(30, "day").toDate();
  const endDate = now.toDate();
  const prevStart = now.subtract(60, "day").toDate();
  const prevEnd = now.subtract(30, "day").toDate();

  const canceledInPeriod = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, "canceled"),
        gte(subscriptions.canceledAt, startDate),
        lte(subscriptions.canceledAt, endDate),
      ),
    );

  const canceledCount = canceledInPeriod.length;
  const totalAtStart = count + canceledCount;
  const churnRate =
    totalAtStart > 0
      ? parseFloat(((canceledCount / totalAtStart) * 100).toFixed(2))
      : 0;

  const newSubsInPeriod = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        gte(subscriptions.startedAt, startDate),
        lte(subscriptions.startedAt, endDate),
      ),
    );

  const totalNewMrr = newSubsInPeriod.reduce(
    (sum, s) =>
      sum +
      normalizeToMonthly(
        s.baseValueInCents ?? s.valueInCents,
        s.billingInterval,
      ),
    0,
  );

  const churnedMrrTotal = canceledInPeriod.reduce(
    (sum, s) =>
      sum +
      normalizeToMonthly(
        s.baseValueInCents ?? s.valueInCents,
        s.billingInterval,
      ),
    0,
  );

  const previousMrr =
    mrr - totalNewMrr + churnedMrrTotal;
  const mrrGrowthRate =
    previousMrr > 0
      ? parseFloat((((mrr - previousMrr) / previousMrr) * 100).toFixed(2))
      : 0;

  return { mrr, activeSubscriptions: count, arpu, churnRate, mrrGrowthRate };
}
