"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, inArray, desc, count } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import type { IActiveSubscription } from "@/interfaces/mrr.interface";
import type { IPaginationMeta } from "@/interfaces/dashboard.interface";

interface GetActiveSubscriptionsParams {
  page?: number;
  limit?: number;
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

  const activeStatuses: ("active" | "trialing" | "past_due")[] = [
    "active",
    "trialing",
    "past_due",
  ];

  const [totalResult] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        inArray(subscriptions.status, activeStatuses)
      )
    );

  const total = Number(totalResult?.count ?? 0);

  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        inArray(subscriptions.status, activeStatuses)
      )
    )
    .orderBy(desc(subscriptions.startedAt))
    .limit(limit)
    .offset(offset);

  return {
    data: rows.map((s) => ({
      subscriptionId: s.subscriptionId,
      customerId: s.customerId,
      planName: s.planName,
      planId: s.planId,
      valueInCents: s.valueInCents,
      billingInterval: s.billingInterval,
      status: s.status,
      startedAt: s.startedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
}
