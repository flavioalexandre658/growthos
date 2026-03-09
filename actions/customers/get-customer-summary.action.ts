"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { customers, payments, subscriptions, events } from "@/db/schema";
import { eq, and, inArray, sum, count, asc } from "drizzle-orm";
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

  const [revenueResult, paymentsResult, subscriptionRow, firstEventRow] =
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

      db
        .select({
          source: events.source,
          medium: events.medium,
          campaign: events.campaign,
          landingPage: events.landingPage,
          device: events.device,
          createdAt: events.createdAt,
        })
        .from(events)
        .where(
          and(
            eq(events.organizationId, organizationId),
            eq(events.customerId, customerId)
          )
        )
        .orderBy(asc(events.createdAt))
        .limit(1),
    ]);

  const ltvInCents = Number(revenueResult[0]?.total ?? 0);
  const paymentsCount = Number(paymentsResult[0]?.cnt ?? 0);
  const activeSubscription = subscriptionRow[0] ?? null;
  const firstEvent = firstEventRow[0];

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
      source: firstEvent?.source ?? null,
      medium: firstEvent?.medium ?? null,
      campaign: firstEvent?.campaign ?? null,
      landingPage: firstEvent?.landingPage ?? null,
      device: firstEvent?.device ?? null,
      firstEventAt: firstEvent?.createdAt ?? null,
    },
  };
}
