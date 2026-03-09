"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { customers, subscriptions, payments } from "@/db/schema";
import { eq, and, inArray, sum, sql } from "drizzle-orm";

export interface ICohortMonth {
  month: string;
  totalCustomers: number;
  subscriberCount: number;
  buyerCount: number;
  churnedCount: number;
  totalLtvInCents: number;
}

export interface ICohortCustomer {
  customerId: string;
  name: string | null;
  email: string | null;
  status: "subscriber" | "buyer" | "churned";
  ltvInCents: number;
}

export interface ICustomerCohortsResult {
  cohorts: ICohortMonth[];
  expandedMonth: string | null;
  expandedCustomers: ICohortCustomer[];
}

export async function getCustomerCohorts(
  organizationId: string,
  expandMonth?: string
): Promise<ICustomerCohortsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { cohorts: [], expandedMonth: null, expandedCustomers: [] };

  const cohortRows = await db
    .select({
      month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${customers.firstSeenAt}), 'YYYY-MM')`,
      totalCustomers: sql<number>`COUNT(*)`,
    })
    .from(customers)
    .where(eq(customers.organizationId, organizationId))
    .groupBy(sql`DATE_TRUNC('month', ${customers.firstSeenAt})`)
    .orderBy(sql`DATE_TRUNC('month', ${customers.firstSeenAt}) DESC`)
    .limit(24);

  if (cohortRows.length === 0) {
    return { cohorts: [], expandedMonth: null, expandedCustomers: [] };
  }

  const allCohortCustomers = await db
    .select({
      customerId: customers.customerId,
      month: sql<string>`TO_CHAR(DATE_TRUNC('month', ${customers.firstSeenAt}), 'YYYY-MM')`,
    })
    .from(customers)
    .where(eq(customers.organizationId, organizationId));

  const customerIdsByMonth = new Map<string, string[]>();
  for (const row of allCohortCustomers) {
    const list = customerIdsByMonth.get(row.month) ?? [];
    list.push(row.customerId);
    customerIdsByMonth.set(row.month, list);
  }

  const allCustomerIds = allCohortCustomers.map((r) => r.customerId);

  const PURCHASE_TYPES = ["purchase", "renewal"];

  const [activeRows, revenueRows] = await Promise.all([
    allCustomerIds.length > 0
      ? db
          .select({ customerId: subscriptions.customerId })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.organizationId, organizationId),
              eq(subscriptions.status, "active"),
              inArray(subscriptions.customerId, allCustomerIds)
            )
          )
      : Promise.resolve([]),

    allCustomerIds.length > 0
      ? db
          .select({
            customerId: payments.customerId,
            ltv: sum(payments.baseGrossValueInCents),
          })
          .from(payments)
          .where(
            and(
              eq(payments.organizationId, organizationId),
              inArray(payments.eventType, PURCHASE_TYPES),
              inArray(payments.customerId, allCustomerIds)
            )
          )
          .groupBy(payments.customerId)
      : Promise.resolve([]),
  ]);

  const activeSet = new Set(activeRows.map((r) => r.customerId));
  const ltvMap = new Map(revenueRows.map((r) => [r.customerId, Number(r.ltv ?? 0)]));
  const paidSet = new Set(revenueRows.filter((r) => Number(r.ltv ?? 0) > 0).map((r) => r.customerId));

  const getStatus = (id: string): "subscriber" | "buyer" | "churned" => {
    if (activeSet.has(id)) return "subscriber";
    if (paidSet.has(id)) return "buyer";
    return "churned";
  };

  const cohorts: ICohortMonth[] = cohortRows.map((row) => {
    const ids = customerIdsByMonth.get(row.month) ?? [];
    const subscriberCount = ids.filter((id) => activeSet.has(id)).length;
    const buyerCount = ids.filter((id) => !activeSet.has(id) && paidSet.has(id)).length;
    const churnedCount = ids.length - subscriberCount - buyerCount;
    const totalLtvInCents = ids.reduce((acc, id) => acc + (ltvMap.get(id) ?? 0), 0);
    return {
      month: row.month,
      totalCustomers: Number(row.totalCustomers),
      subscriberCount,
      buyerCount,
      churnedCount,
      totalLtvInCents,
    };
  });

  let expandedCustomers: ICohortCustomer[] = [];
  if (expandMonth) {
    const monthIds = customerIdsByMonth.get(expandMonth) ?? [];
    if (monthIds.length > 0) {
      const custRows = await db
        .select({ customerId: customers.customerId, name: customers.name, email: customers.email })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, organizationId),
            inArray(customers.customerId, monthIds)
          )
        )
        .limit(100);

      expandedCustomers = custRows.map((c) => ({
        customerId: c.customerId,
        name: c.name,
        email: c.email,
        status: getStatus(c.customerId),
        ltvInCents: ltvMap.get(c.customerId) ?? 0,
      }));
    }
  }

  return {
    cohorts,
    expandedMonth: expandMonth ?? null,
    expandedCustomers,
  };
}
