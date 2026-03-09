"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { customers, subscriptions } from "@/db/schema";
import { eq, and, lt, desc, sql } from "drizzle-orm";

export interface IAtRiskCustomer {
  customerId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  lastSeenAt: Date;
  firstSeenAt: Date;
  daysInactive: number;
  planName: string;
  planId: string;
  valueInCents: number;
  billingInterval: string;
  subscriptionId: string;
}

export async function getAtRiskCustomers(
  organizationId: string,
  daysThreshold = 30
): Promise<IAtRiskCustomer[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const thresholdDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      customerId: customers.customerId,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      country: customers.country,
      city: customers.city,
      lastSeenAt: customers.lastSeenAt,
      firstSeenAt: customers.firstSeenAt,
      planName: subscriptions.planName,
      planId: subscriptions.planId,
      valueInCents: subscriptions.valueInCents,
      billingInterval: subscriptions.billingInterval,
      subscriptionId: subscriptions.subscriptionId,
    })
    .from(customers)
    .innerJoin(
      subscriptions,
      and(
        eq(subscriptions.organizationId, customers.organizationId),
        eq(subscriptions.customerId, customers.customerId),
        eq(subscriptions.status, "active")
      )
    )
    .where(
      and(
        eq(customers.organizationId, organizationId),
        lt(customers.lastSeenAt, thresholdDate)
      )
    )
    .orderBy(desc(subscriptions.valueInCents))
    .limit(100);

  const now = Date.now();
  return rows.map((r) => ({
    ...r,
    daysInactive: Math.floor((now - r.lastSeenAt.getTime()) / (24 * 60 * 60 * 1000)),
  }));
}

export async function getAtRiskCustomersCount(
  organizationId: string,
  daysThreshold = 30
): Promise<{ count: number; totalValueInCents: number; topCustomers: { name: string | null; email: string | null }[] }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { count: 0, totalValueInCents: 0, topCustomers: [] };

  const thresholdDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

  const [countRow, topRows] = await Promise.all([
    db
      .select({ cnt: sql<number>`COUNT(*)`, totalValue: sql<number>`SUM(${subscriptions.valueInCents})` })
      .from(customers)
      .innerJoin(
        subscriptions,
        and(
          eq(subscriptions.organizationId, customers.organizationId),
          eq(subscriptions.customerId, customers.customerId),
          eq(subscriptions.status, "active")
        )
      )
      .where(
        and(
          eq(customers.organizationId, organizationId),
          lt(customers.lastSeenAt, thresholdDate)
        )
      ),

    db
      .select({ name: customers.name, email: customers.email })
      .from(customers)
      .innerJoin(
        subscriptions,
        and(
          eq(subscriptions.organizationId, customers.organizationId),
          eq(subscriptions.customerId, customers.customerId),
          eq(subscriptions.status, "active")
        )
      )
      .where(
        and(
          eq(customers.organizationId, organizationId),
          lt(customers.lastSeenAt, thresholdDate)
        )
      )
      .orderBy(desc(subscriptions.valueInCents))
      .limit(3),
  ]);

  return {
    count: Number(countRow[0]?.cnt ?? 0),
    totalValueInCents: Number(countRow[0]?.totalValue ?? 0),
    topCustomers: topRows,
  };
}
