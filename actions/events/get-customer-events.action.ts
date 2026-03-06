"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, asc, ne } from "drizzle-orm";
import { db } from "@/db";
import { events, payments } from "@/db/schema";
import type { ICustomerEvent } from "@/interfaces/event.interface";

const PAYMENT_EVENT_TYPES = [
  "purchase",
  "renewal",
  "refund",
  "subscription_canceled",
  "subscription_changed",
];

export async function getCustomerEvents(
  organizationId: string,
  customerId: string
): Promise<ICustomerEvent[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];

  const [eventsRows, paymentsRows] = await Promise.all([
    db
      .select({
        id: events.id,
        eventType: events.eventType,
        grossValueInCents: events.grossValueInCents,
        baseCurrency: events.baseCurrency,
        baseGrossValueInCents: events.baseGrossValueInCents,
        productName: events.productName,
        productId: events.productId,
        landingPage: events.landingPage,
        source: events.source,
        medium: events.medium,
        campaign: events.campaign,
        device: events.device,
        customerId: events.customerId,
        category: events.category,
        paymentMethod: events.paymentMethod,
        eventHash: events.eventHash,
        sessionId: events.sessionId,
        createdAt: events.createdAt,
      })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.customerId, customerId),
          ne(events.eventType, "pageview")
        )
      )
      .orderBy(asc(events.createdAt))
      .limit(100),

    db
      .select({
        id: payments.id,
        eventType: payments.eventType,
        grossValueInCents: payments.grossValueInCents,
        baseCurrency: payments.baseCurrency,
        baseGrossValueInCents: payments.baseGrossValueInCents,
        productName: payments.productName,
        productId: payments.productId,
        landingPage: payments.landingPage,
        source: payments.source,
        medium: payments.medium,
        campaign: payments.campaign,
        device: payments.device,
        customerId: payments.customerId,
        category: payments.category,
        paymentMethod: payments.paymentMethod,
        eventHash: payments.eventHash,
        sessionId: payments.sessionId,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, organizationId),
          eq(payments.customerId, customerId)
        )
      )
      .orderBy(asc(payments.createdAt))
      .limit(100),
  ]);

  const eventHashes = new Set(eventsRows.map((r) => r.eventHash).filter(Boolean));

  const merged: ICustomerEvent[] = [
    ...eventsRows,
    ...paymentsRows.filter((r) => !eventHashes.has(r.eventHash)),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).slice(0, 100);

  return merged;
}
