"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { customers, payments } from "@/db/schema";
import { eq, and, isNotNull, sum, count, desc, sql } from "drizzle-orm";

export type TopCustomerSortBy = "ltv" | "payments" | "lastSeen";

export interface ITopCustomer {
  customerId: string;
  name: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  lastSeenAt: Date;
  firstSeenAt: Date;
  ltvInCents: number;
  paymentsCount: number;
  firstSource: string | null;
  firstCampaign: string | null;
  firstMedium: string | null;
  rank?: number;
}

export async function getTopCustomers(
  organizationId: string,
  params: { limit?: number; sortBy?: TopCustomerSortBy } = {}
): Promise<ITopCustomer[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  if (!organizationId) return [];

  const limit = params.limit ?? 50;
  const sortBy = params.sortBy ?? "ltv";

  const customerRows = await db
    .select({
      customerId: customers.customerId,
      name: customers.name,
      email: customers.email,
      country: customers.country,
      city: customers.city,
      lastSeenAt: customers.lastSeenAt,
      firstSeenAt: customers.firstSeenAt,
      firstSource: customers.firstSource,
      firstCampaign: customers.firstCampaign,
      firstMedium: customers.firstMedium,
    })
    .from(customers)
    .where(eq(customers.organizationId, organizationId));

  if (customerRows.length === 0) return [];

  const customerIds = customerRows.map((c) => c.customerId);

  const revenueRows = await db
    .select({
      customerId: payments.customerId,
      ltvInCents: sum(payments.baseGrossValueInCents),
      paymentsCount: count(),
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        isNotNull(payments.customerId),
        sql`${payments.eventType} = ANY(${sql.raw(`ARRAY['purchase','renewal']`)}::text[])`,
        sql`${payments.customerId} = ANY(${sql.raw(`ARRAY[${customerIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")}]`)})`
      )
    )
    .groupBy(payments.customerId);

  const revenueMap = new Map(revenueRows.map((r) => [r.customerId, r]));

  const result: ITopCustomer[] = customerRows.map((c) => {
    const rev = revenueMap.get(c.customerId);
    return {
      customerId: c.customerId,
      name: c.name,
      email: c.email,
      country: c.country,
      city: c.city,
      lastSeenAt: c.lastSeenAt,
      firstSeenAt: c.firstSeenAt,
      ltvInCents: Number(rev?.ltvInCents ?? 0),
      paymentsCount: Number(rev?.paymentsCount ?? 0),
      firstSource: c.firstSource ?? null,
      firstCampaign: c.firstCampaign ?? null,
      firstMedium: c.firstMedium ?? null,
    };
  });

  if (sortBy === "lastSeen") {
    result.sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
  } else if (sortBy === "payments") {
    result.sort((a, b) => b.paymentsCount - a.paymentsCount);
  } else {
    result.sort((a, b) => b.ltvInCents - a.ltvInCents);
  }

  return result.slice(0, limit).map((c, idx) => ({ ...c, rank: idx + 1 }));
}

