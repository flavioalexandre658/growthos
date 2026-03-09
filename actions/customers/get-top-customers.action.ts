"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { customers, payments, events } from "@/db/schema";
import { eq, and, inArray, sum, count, desc, asc, sql } from "drizzle-orm";

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
        inArray(payments.eventType, PURCHASE_TYPES)
      )
    )
    .groupBy(payments.customerId)
    .orderBy(
      sortBy === "payments"
        ? desc(count())
        : desc(sum(payments.baseGrossValueInCents))
    )
    .limit(limit);

  const customerIds = revenueRows
    .map((r) => r.customerId)
    .filter(Boolean) as string[];

  if (customerIds.length === 0) return [];

  const [customerRows, firstEventRows] = await Promise.all([
    db
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
      .where(
        and(
          eq(customers.organizationId, organizationId),
          sql`${customers.customerId} = ANY(${sql.raw(`ARRAY[${customerIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")}]`)})`,
        )
      ),

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
          sql`${events.customerId} = ANY(${sql.raw(`ARRAY[${customerIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")}]`)})`,
        )
      )
      .groupBy(events.customerId),
  ]);

  const customerMap = new Map(customerRows.map((c) => [c.customerId, c]));
  const eventMap = new Map(firstEventRows.map((e) => [e.customerId, e]));

  const result: ITopCustomer[] = revenueRows
    .filter((r) => r.customerId && customerMap.has(r.customerId!))
    .map((r, idx) => {
      const c = customerMap.get(r.customerId!)!;
      const e = eventMap.get(r.customerId!);
      return {
        customerId: r.customerId!,
        name: c.name,
        email: c.email,
        country: c.country,
        city: c.city,
        lastSeenAt: c.lastSeenAt,
        firstSeenAt: c.firstSeenAt,
        ltvInCents: Number(r.ltvInCents ?? 0),
        paymentsCount: Number(r.paymentsCount ?? 0),
        firstSource: e?.source ?? null,
        firstCampaign: e?.campaign ?? null,
        firstMedium: e?.medium ?? null,
        rank: idx + 1,
      };
    });

  if (sortBy === "lastSeen") {
    result.sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
  }

  return result;
}
