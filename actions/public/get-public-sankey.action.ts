"use server";

import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { normalizeToMonthly } from "@/utils/billing";
import dayjs from "@/utils/dayjs";

export interface IPublicSankeyData {
  newSubscriptions: number;
  renewalSubscriptions: number;
  activeSubscriptions: number;
  churnedSubscriptions: number;
  pastDueSubscriptions: number;
  mrr: number;
}

export async function getPublicSankeyData(
  organizationId: string,
): Promise<IPublicSankeyData> {
  const now = dayjs();
  const startDate = now.startOf("month").toDate();
  const endDate = now.endOf("month").toDate();

  const activeSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, "active"),
      ),
    );

  const pastDueSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, "past_due"),
      ),
    );

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

  const mrr = activeSubs.reduce(
    (sum, s) =>
      sum +
      normalizeToMonthly(
        s.baseValueInCents ?? s.valueInCents,
        s.billingInterval,
      ),
    0,
  );

  const newSubIds = new Set(newSubsInPeriod.map((s) => s.subscriptionId));
  const renewalSubscriptions = activeSubs.filter(
    (s) => !newSubIds.has(s.subscriptionId),
  ).length;

  return {
    newSubscriptions: newSubsInPeriod.length,
    renewalSubscriptions,
    activeSubscriptions: activeSubs.length,
    churnedSubscriptions: canceledInPeriod.length,
    pastDueSubscriptions: pastDueSubs.length,
    mrr,
  };
}
