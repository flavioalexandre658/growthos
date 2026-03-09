"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { customers, payments, events } from "@/db/schema";
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

  const limit = params.limit ?? 50;
  const sortBy = params.sortBy ?? "ltv";

  const PURCHASE_TYPES = ["purchase", "renewal"];

  const customerRows = await db
    .select({
      customerId: customers.customerId,
      name: customers.name,
      email: customers.email,
      country: customers.country,
      city: customers.city,
      lastSeenAt: customers.lastSeenAt,
      firstSeenAt: customers.firstSeenAt,
    })
    .from(customers)
    .where(eq(customers.organizationId, organizationId));

  if (customerRows.length === 0) return [];

  const customerIds = customerRows.map((c) => c.customerId);

  const [revenueRows, firstEventRows] = await Promise.all([
    db
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
      .groupBy(payments.customerId),

    db
      .select({
        customerId: events.customerId,
        source: sql<string | null>`MIN(CASE WHEN ${events.source} IS NOT NULL THEN ${events.source} END)`,
        campaign: sql<string | null>`MIN(CASE WHEN ${events.campaign} IS NOT NULL THEN ${events.campaign} END)`,
        medium: sql<string | null>`MIN(CASE WHEN ${events.medium} IS NOT NULL THEN ${events.medium} END)`,
      })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          isNotNull(events.customerId),
          sql`${events.customerId} = ANY(${sql.raw(`ARRAY[${customerIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")}]`)})`
        )
      )
      .groupBy(events.customerId),
  ]);

  const revenueMap = new Map(revenueRows.map((r) => [r.customerId, r]));
  const eventMap = new Map(firstEventRows.map((e) => [e.customerId, e]));

  const result: ITopCustomer[] = customerRows.map((c) => {
    const rev = revenueMap.get(c.customerId);
    const ev = eventMap.get(c.customerId);
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
      firstSource: ev?.source ?? null,
      firstCampaign: ev?.campaign ?? null,
      firstMedium: ev?.medium ?? null,
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

