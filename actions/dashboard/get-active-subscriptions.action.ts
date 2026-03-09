"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, customers } from "@/db/schema";
import dayjs from "@/utils/dayjs";
import { normalizeToMonthly } from "@/utils/billing";
import type {
  IActiveSubscription,
  IAvailablePlan,
  SubscriptionStatusFilter,
  BillingIntervalFilter,
  NextBillingFilter,
  SubscriptionSortField,
  SortDirection,
} from "@/interfaces/mrr.interface";
import type { IPaginationMeta } from "@/interfaces/dashboard.interface";

function intervalToMonths(interval: string): number {
  if (interval === "yearly") return 12;
  if (interval === "semiannual") return 6;
  if (interval === "quarterly") return 3;
  return 1;
}

function computeNextBilling(startedAt: Date, interval: string): Date | null {
  const now = dayjs();
  const start = dayjs(startedAt);
  if (!start.isValid()) return null;

  if (interval === "weekly") {
    let next = start;
    while (next.isBefore(now) || next.isSame(now, "day")) next = next.add(1, "week");
    return next.toDate();
  }

  const months = intervalToMonths(interval);
  let next = start;
  while (next.isBefore(now) || next.isSame(now, "day")) next = next.add(months, "month");
  return next.toDate();
}

function computeRenewalCount(startedAt: Date, interval: string): number {
  const point = dayjs();
  const start = dayjs(startedAt);
  if (!start.isValid()) return 0;

  if (interval === "weekly") return Math.max(0, point.diff(start, "week"));

  const months = intervalToMonths(interval);
  const totalMonths = Math.max(0, point.diff(start, "month"));
  return Math.floor(totalMonths / months);
}

interface GetActiveSubscriptionsParams {
  page?: number;
  limit?: number;
  status?: SubscriptionStatusFilter;
  planId?: string;
  billingInterval?: BillingIntervalFilter;
  nextBilling?: NextBillingFilter;
  sortField?: SubscriptionSortField;
  sortDir?: SortDirection;
}

interface GetActiveSubscriptionsResult {
  data: IActiveSubscription[];
  pagination: IPaginationMeta;
  availablePlans: IAvailablePlan[];
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
  const sortField = params.sortField ?? "nextBilling";
  const sortDir = params.sortDir ?? "asc";

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

  const baseWhereClauses = [
    eq(subscriptions.organizationId, organizationId),
    statusCondition,
    ...(params.planId ? [eq(subscriptions.planId, params.planId)] : []),
    ...(params.billingInterval && params.billingInterval !== "all"
      ? [eq(subscriptions.billingInterval, params.billingInterval)]
      : []),
  ];

  const baseWhere = and(...baseWhereClauses);

  const allOrgRows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId));

  const planMap = new Map<string, { planId: string; planName: string; count: number }>();
  for (const row of allOrgRows) {
    if (!planMap.has(row.planId)) {
      planMap.set(row.planId, { planId: row.planId, planName: row.planName, count: 0 });
    }
    planMap.get(row.planId)!.count += 1;
  }
  const availablePlans = Array.from(planMap.values()).sort((a, b) =>
    a.planName.localeCompare(b.planName)
  );

  const rows = await db
    .select()
    .from(subscriptions)
    .where(baseWhere);

  const now = dayjs();

  const mapped = rows.map((s) => {
    const monthlyValue = normalizeToMonthly(s.valueInCents, s.billingInterval);
    const renewalCount = computeRenewalCount(s.startedAt, s.billingInterval);
    const estimatedLtvInCents = monthlyValue * Math.max(renewalCount, 1);
    const nextBillingAt =
      s.status === "canceled" ? null : computeNextBilling(s.startedAt, s.billingInterval);
    return {
      subscriptionId: s.subscriptionId,
      customerId: s.customerId,
      customerName: null as string | null,
      customerEmail: null as string | null,
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
  });

  const filtered = mapped.filter((item) => {
    if (!params.nextBilling || params.nextBilling === "all") return true;
    if (!item.nextBillingAt) return false;

    const next = dayjs(item.nextBillingAt);

    if (params.nextBilling === "today") return next.isSame(now, "day");
    if (params.nextBilling === "7d") return next.isAfter(now) && next.isBefore(now.add(7, "day").endOf("day"));
    if (params.nextBilling === "30d") return next.isAfter(now) && next.isBefore(now.add(30, "day").endOf("day"));

    return true;
  });

  const dirMultiplier = sortDir === "asc" ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortField === "value") {
      return (a.valueInCents - b.valueInCents) * dirMultiplier;
    }
    if (sortField === "ltv") {
      return (a.estimatedLtvInCents - b.estimatedLtvInCents) * dirMultiplier;
    }
    if (sortField === "renewals") {
      return (a.renewalCount - b.renewalCount) * dirMultiplier;
    }
    if (sortField === "startedAt") {
      return (a.startedAt.getTime() - b.startedAt.getTime()) * dirMultiplier;
    }
    if (!a.nextBillingAt && !b.nextBillingAt) return 0;
    if (!a.nextBillingAt) return 1;
    if (!b.nextBillingAt) return -1;
    return (a.nextBillingAt.getTime() - b.nextBillingAt.getTime()) * dirMultiplier;
  });

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  const uniqueCustomerIds = [...new Set(paginated.map((s) => s.customerId).filter(Boolean))];
  if (uniqueCustomerIds.length > 0) {
    const customerRows = await db
      .select({
        customerId: customers.customerId,
        name: customers.name,
        email: customers.email,
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          inArray(customers.customerId, uniqueCustomerIds)
        )
      );

    const customerMap = new Map(customerRows.map((c) => [c.customerId, c]));
    for (const item of paginated) {
      const match = customerMap.get(item.customerId);
      if (match) {
        item.customerName = match.name;
        item.customerEmail = match.email;
      }
    }
  }

  return {
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    availablePlans,
  };
}
