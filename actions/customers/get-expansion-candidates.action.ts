"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { customers, subscriptions, payments } from "@/db/schema";
import { eq, and, inArray, sum, lt, desc, sql } from "drizzle-orm";

export interface IExpansionCandidate {
  customerId: string;
  name: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  planName: string;
  planId: string;
  valueInCents: number;
  billingInterval: string;
  subscriptionId: string;
  startedAt: Date;
  tenureMonths: number;
  ltvInCents: number;
}

export async function getExpansionCandidates(
  organizationId: string,
  params: { minLtvCents?: number; minTenureMonths?: number } = {}
): Promise<IExpansionCandidate[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const minLtvCents = params.minLtvCents ?? 120000;
  const minTenureMonths = params.minTenureMonths ?? 6;

  const tenureThreshold = new Date();
  tenureThreshold.setMonth(tenureThreshold.getMonth() - minTenureMonths);

  const subscriptionRows = await db
    .select({
      customerId: subscriptions.customerId,
      planName: subscriptions.planName,
      planId: subscriptions.planId,
      valueInCents: subscriptions.valueInCents,
      billingInterval: subscriptions.billingInterval,
      subscriptionId: subscriptions.subscriptionId,
      startedAt: subscriptions.startedAt,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, "active"),
        lt(subscriptions.startedAt, tenureThreshold)
      )
    );

  if (subscriptionRows.length === 0) return [];

  const customerIds = subscriptionRows.map((s) => s.customerId);

  const PURCHASE_TYPES = ["purchase", "renewal"];

  const [customerRows, revenueRows] = await Promise.all([
    db
      .select({
        customerId: customers.customerId,
        name: customers.name,
        email: customers.email,
        country: customers.country,
        city: customers.city,
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          inArray(customers.customerId, customerIds)
        )
      ),

    db
      .select({
        customerId: payments.customerId,
        ltv: sum(payments.baseGrossValueInCents),
      })
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, organizationId),
          inArray(payments.eventType, PURCHASE_TYPES),
          inArray(payments.customerId, customerIds)
        )
      )
      .groupBy(payments.customerId),
  ]);

  const customerMap = new Map(customerRows.map((c) => [c.customerId, c]));
  const ltvMap = new Map(revenueRows.map((r) => [r.customerId, Number(r.ltv ?? 0)]));

  const now = Date.now();

  return subscriptionRows
    .filter((s) => {
      const ltv = ltvMap.get(s.customerId) ?? 0;
      return ltv >= minLtvCents && customerMap.has(s.customerId);
    })
    .map((s) => {
      const c = customerMap.get(s.customerId)!;
      const tenureMs = now - s.startedAt.getTime();
      const tenureMonths = Math.floor(tenureMs / (1000 * 60 * 60 * 24 * 30));
      return {
        customerId: s.customerId,
        name: c.name,
        email: c.email,
        country: c.country,
        city: c.city,
        planName: s.planName,
        planId: s.planId,
        valueInCents: s.valueInCents,
        billingInterval: s.billingInterval,
        subscriptionId: s.subscriptionId,
        startedAt: s.startedAt,
        tenureMonths,
        ltvInCents: ltvMap.get(s.customerId) ?? 0,
      };
    })
    .sort((a, b) => b.ltvInCents - a.ltvInCents)
    .slice(0, 100);
}
