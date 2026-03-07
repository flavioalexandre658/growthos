import { db } from "@/db";
import { payments } from "@/db/schema";

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
    .onConflictDoNothing({ target: [payments.organizationId, payments.eventHash] });
}
