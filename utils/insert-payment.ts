import { db } from "@/db";
import { payments } from "@/db/schema";
import { sql } from "drizzle-orm";

export const FINANCIAL_EVENT_TYPES = [
  "purchase",
  "renewal",
  "refund",
  "subscription_canceled",
  "subscription_changed",
] as const;

export type FinancialEventType = (typeof FINANCIAL_EVENT_TYPES)[number];

export function isFinancialEventType(eventType: string): boolean {
  return (FINANCIAL_EVENT_TYPES as readonly string[]).includes(eventType);
}

type InsertPaymentData = typeof payments.$inferInsert;

export async function insertPayment(data: InsertPaymentData): Promise<void> {
  await db
    .insert(payments)
    .values(data)
    .onConflictDoUpdate({
      target: [payments.organizationId, payments.eventHash],
      set: {
        eventType: data.eventType,
        grossValueInCents: data.grossValueInCents,
        baseGrossValueInCents: data.baseGrossValueInCents,
        baseNetValueInCents: data.baseNetValueInCents,
        discountInCents: data.discountInCents,
        currency: data.currency,
        baseCurrency: data.baseCurrency,
        exchangeRate: data.exchangeRate,
        paymentMethod: data.paymentMethod,
        billingType: data.billingType,
        billingReason: data.billingReason,
        billingInterval: data.billingInterval,
        subscriptionId: data.subscriptionId,
        customerId: sql`CASE WHEN ${data.customerId ?? null} IS NOT NULL AND ${data.customerId ?? null} NOT LIKE 'cus_%' THEN ${data.customerId ?? null} WHEN ${payments.customerId} IS NOT NULL AND ${payments.customerId} NOT LIKE 'cus_%' THEN ${payments.customerId} ELSE COALESCE(${data.customerId ?? null}, ${payments.customerId}) END`,
        source: data.source,
        medium: data.medium,
        campaign: data.campaign,
        content: data.content,
        landingPage: data.landingPage,
        entryPage: data.entryPage,
        referrer: data.referrer,
        device: data.device,
        sessionId: data.sessionId,
        productId: data.productId,
        productName: data.productName,
        category: data.category,
        metadata: data.metadata,
        createdAt: data.createdAt,
      },
    });
}
