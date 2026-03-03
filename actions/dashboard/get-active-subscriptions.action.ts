"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, inArray, or, desc, count } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import dayjs from "@/utils/dayjs";
import type { IActiveSubscription, SubscriptionStatusFilter } from "@/interfaces/mrr.interface";
import type { IPaginationMeta } from "@/interfaces/dashboard.interface";

function normalizeToMonthly(valueInCents: number, interval: string): number {
  if (interval === "yearly") return Math.round(valueInCents / 12);
  if (interval === "weekly") return Math.round(valueInCents * 4.33);
  return valueInCents;
}

function computeNextBilling(startedAt: Date, interval: string): Date | null {
  const now = dayjs();
  const start = dayjs(startedAt);
  if (!start.isValid()) return null;

  const unit = interval === "yearly" ? "year" : interval === "weekly" ? "week" : "month";
  let next = start;
  while (next.isBefore(now) || next.isSame(now, "day")) {
    next = next.add(1, unit);
  }
  return next.toDate();
}

function computeRenewalCount(startedAt: Date, interval: string): number {
  const now = dayjs();
  const start = dayjs(startedAt);
  if (!start.isValid()) return 0;

  if (interval === "yearly") return Math.max(0, now.diff(start, "year"));
  if (interval === "weekly") return Math.max(0, now.diff(start, "week"));
  return Math.max(0, now.diff(start, "month"));
}

interface GetActiveSubscriptionsParams {
  page?: number;
  limit?: number;
  status?: SubscriptionStatusFilter;
}

interface GetActiveSubscriptionsResult {
  data: IActiveSubscription[];
  pagination: IPaginationMeta;
}

export async function getActiveSubscriptions(
  organizationId: string,
  params: GetActiveSubscriptionsParams = {}
): Promise<GetActiveSubscriptionsResult | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;
  const statusFilter = params.status ?? "all";

  const defaultStatuses: ("active" | "trialing" | "past_due")[] = [
    "active",
    "trialing",
    "past_due",
  ];

  const statusCondition =
    statusFilter === "all"
      ? or(
          inArray(subscriptions.status, defaultStatuses),
          eq(subscriptions.status, "canceled")
        )
      : statusFilter === "canceled"
        ? eq(subscriptions.status, "canceled")
        : inArray(subscriptions.status, [statusFilter as "active" | "trialing" | "past_due"]);

  const baseWhere = and(
    eq(subscriptions.organizationId, organizationId),
    statusCondition
  );

  const [totalResult] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(baseWhere);

  const total = Number(totalResult?.count ?? 0);

  const rows = await db
    .select()
    .from(subscriptions)
    .where(baseWhere)
    .orderBy(desc(subscriptions.startedAt))
    .limit(limit)
    .offset(offset);

  return {
    data: rows.map((s) => {
      const monthlyValue = normalizeToMonthly(s.valueInCents, s.billingInterval);
      const renewalCount = computeRenewalCount(s.startedAt, s.billingInterval);
      const estimatedLtvInCents = monthlyValue * Math.max(renewalCount, 1);
      const nextBillingAt =
        s.status === "canceled" ? null : computeNextBilling(s.startedAt, s.billingInterval);
      return {
        subscriptionId: s.subscriptionId,
        customerId: s.customerId,
        planName: s.planName,
        planId: s.planId,
        valueInCents: s.valueInCents,
        billingInterval: s.billingInterval,
        status: s.status,
        startedAt: s.startedAt,
        canceledAt: s.canceledAt,
        renewalCount,
        nextBillingAt,
        estimatedLtvInCents,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}
