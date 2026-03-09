"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, ilike, or, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, organizations, customers } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type { ISubscriptionParams, ISubscriptionsResult } from "@/interfaces/subscription.interface";

export async function getSubscriptions(
  organizationId: string,
  params: ISubscriptionParams = {}
): Promise<ISubscriptionsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      data: [],
      pagination: { page: 1, limit: 25, total: 0, total_pages: 0 },
      distinctPlans: [],
      distinctIntervals: [],
    };
  }

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const { startDate, endDate } = resolveDateRange(params, tz);

  const page = params.page ?? 1;
  const limit = params.limit ?? 25;
  const offset = (page - 1) * limit;

  const baseConditions = [
    eq(subscriptions.organizationId, organizationId),
    gte(subscriptions.startedAt, startDate),
    lte(subscriptions.startedAt, endDate),
  ];

  if (params.status && params.status !== "all") {
    baseConditions.push(
      eq(
        subscriptions.status,
        params.status as "active" | "canceled" | "past_due" | "trialing"
      )
    );
  }

  if (params.plan_id) {
    baseConditions.push(eq(subscriptions.planId, params.plan_id));
  }

  if (params.billing_interval && params.billing_interval !== "all") {
    baseConditions.push(
      eq(
        subscriptions.billingInterval,
        params.billing_interval as
          | "monthly"
          | "quarterly"
          | "semiannual"
          | "yearly"
          | "weekly"
      )
    );
  }

  if (params.search) {
    const term = `%${params.search}%`;
    baseConditions.push(
      or(
        ilike(subscriptions.customerId, term),
        ilike(subscriptions.subscriptionId, term),
        ilike(subscriptions.planName, term)
      )!
    );
  }

  const whereClause = and(...baseConditions);

  const [totalRow, rows] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions)
      .where(whereClause),
    db
      .select()
      .from(subscriptions)
      .where(whereClause)
      .orderBy(
        params.order_dir === "ASC"
          ? subscriptions.startedAt
          : sql`${subscriptions.startedAt} DESC`
      )
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(totalRow[0]?.count ?? 0);

  const mappedRows = rows.map((s) => ({
    id: s.id,
    subscriptionId: s.subscriptionId,
    customerId: s.customerId,
    customerName: null as string | null,
    customerEmail: null as string | null,
    planId: s.planId,
    planName: s.planName,
    status: s.status,
    valueInCents: s.valueInCents,
    currency: s.currency,
    billingInterval: s.billingInterval,
    startedAt: s.startedAt,
    canceledAt: s.canceledAt,
    createdAt: s.createdAt,
  }));

  const uniqueCustomerIds = [...new Set(mappedRows.map((r) => r.customerId).filter(Boolean))];
  if (uniqueCustomerIds.length > 0) {
    const customerRows = await db
      .select({ customerId: customers.customerId, name: customers.name, email: customers.email })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          inArray(customers.customerId, uniqueCustomerIds)
        )
      );
    const customerMap = new Map(customerRows.map((c) => [c.customerId, c]));
    for (const item of mappedRows) {
      const match = customerMap.get(item.customerId);
      if (match) {
        item.customerName = match.name;
        item.customerEmail = match.email;
      }
    }
  }

  const [planRows, intervalRows] = await Promise.all([
    db
      .selectDistinct({
        planId: subscriptions.planId,
        planName: subscriptions.planName,
      })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .orderBy(subscriptions.planName),
    db
      .selectDistinct({ val: subscriptions.billingInterval })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .orderBy(subscriptions.billingInterval),
  ]);

  return {
    data: mappedRows,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    distinctPlans: planRows.map((r) => ({ planId: r.planId, planName: r.planName })),
    distinctIntervals: intervalRows.map((r) => r.val).filter(Boolean) as string[],
  };
}
