"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { customers, payments, subscriptions } from "@/db/schema";
import { eq, and, inArray, sum, count } from "drizzle-orm";
import type { ICustomer } from "@/interfaces/customer.interface";

export interface ICustomerSummary {
  customer: ICustomer;
  ltvInCents: number;
  paymentsCount: number;
  activeSubscription: {
    subscriptionId: string;
    planName: string;
    valueInCents: number;
    billingInterval: string;
    status: string;
    startedAt: Date;
  } | null;
  acquisition: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    landingPage: string | null;
    device: string | null;
    firstEventAt: Date | null;
  };
}

export async function getCustomerSummary(
  organizationId: string,
  customerId: string
): Promise<ICustomerSummary | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const [customerRow] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, organizationId),
        eq(customers.customerId, customerId)
      )
    )
    .limit(1);

  if (!customerRow) return null;

  const PURCHASE_TYPES = ["purchase", "renewal"];

  const [revenueResult, paymentsResult, subscriptionRow] =
    await Promise.all([
      db
        .select({ total: sum(payments.baseGrossValueInCents) })
        .from(payments)
        .where(
          and(
            eq(payments.organizationId, organizationId),
            eq(payments.customerId, customerId),
            inArray(payments.eventType, PURCHASE_TYPES)
          )
        ),

      db
        .select({ cnt: count() })
        .from(payments)
        .where(
          and(
            eq(payments.organizationId, organizationId),
            eq(payments.customerId, customerId),
            inArray(payments.eventType, PURCHASE_TYPES)
          )
        ),

      db
        .select({
          subscriptionId: subscriptions.subscriptionId,
          planName: subscriptions.planName,
          valueInCents: subscriptions.valueInCents,
          billingInterval: subscriptions.billingInterval,
          status: subscriptions.status,
          startedAt: subscriptions.startedAt,
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.organizationId, organizationId),
            eq(subscriptions.customerId, customerId),
            eq(subscriptions.status, "active")
          )
        )
        .limit(1),
    ]);

  const ltvInCents = Number(revenueResult[0]?.total ?? 0);
  const paymentsCount = Number(paymentsResult[0]?.cnt ?? 0);
  const activeSubscription = subscriptionRow[0] ?? null;

  return {
    customer: customerRow as ICustomer,
    ltvInCents,
    paymentsCount,
    activeSubscription: activeSubscription
      ? {
          subscriptionId: activeSubscription.subscriptionId,
          planName: activeSubscription.planName,
          valueInCents: activeSubscription.valueInCents,
          billingInterval: activeSubscription.billingInterval,
          status: activeSubscription.status,
          startedAt: activeSubscription.startedAt,
        }
      : null,
    acquisition: {
      source: customerRow.firstSource ?? null,
      medium: customerRow.firstMedium ?? null,
      campaign: customerRow.firstCampaign ?? null,
      landingPage: customerRow.firstLandingPage ?? null,
      device: customerRow.firstDevice ?? null,
      firstEventAt: customerRow.firstSeenAt ?? null,
    },
  };
}
