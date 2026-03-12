import { db } from "@/db";
import { payments, events, customers, subscriptions } from "@/db/schema";
import { sql } from "drizzle-orm";

const CHUNK_SIZE = 200;

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

type PaymentInsert = typeof payments.$inferInsert;
type EventInsert = typeof events.$inferInsert;
type SubscriptionInsert = typeof subscriptions.$inferInsert;

export async function bulkUpsertPayments(rows: PaymentInsert[]): Promise<number> {
  if (rows.length === 0) return 0;
  let inserted = 0;

  for (const chunk of chunks(rows, CHUNK_SIZE)) {
    await db
      .insert(payments)
      .values(chunk)
      .onConflictDoUpdate({
        target: [payments.organizationId, payments.eventHash],
        set: {
          eventType: sql`excluded.event_type`,
          grossValueInCents: sql`excluded.gross_value_in_cents`,
          baseGrossValueInCents: sql`excluded.base_gross_value_in_cents`,
          baseNetValueInCents: sql`excluded.base_net_value_in_cents`,
          discountInCents: sql`excluded.discount_in_cents`,
          currency: sql`excluded.currency`,
          baseCurrency: sql`excluded.base_currency`,
          exchangeRate: sql`excluded.exchange_rate`,
          paymentMethod: sql`excluded.payment_method`,
          billingType: sql`excluded.billing_type`,
          billingReason: sql`excluded.billing_reason`,
          billingInterval: sql`excluded.billing_interval`,
          subscriptionId: sql`excluded.subscription_id`,
          customerId: sql`excluded.customer_id`,
          provider: sql`excluded.provider`,
          source: sql`excluded.source`,
          medium: sql`excluded.medium`,
          campaign: sql`excluded.campaign`,
          content: sql`excluded.content`,
          landingPage: sql`excluded.landing_page`,
          entryPage: sql`excluded.entry_page`,
          referrer: sql`excluded.referrer`,
          device: sql`excluded.device`,
          sessionId: sql`excluded.session_id`,
          productId: sql`excluded.product_id`,
          productName: sql`excluded.product_name`,
          category: sql`excluded.category`,
          metadata: sql`excluded.metadata`,
          createdAt: sql`excluded.created_at`,
        },
      });
    inserted += chunk.length;
  }

  return inserted;
}

export async function bulkUpsertEvents(rows: EventInsert[]): Promise<number> {
  if (rows.length === 0) return 0;
  let inserted = 0;

  for (const chunk of chunks(rows, CHUNK_SIZE)) {
    await db
      .insert(events)
      .values(chunk)
      .onConflictDoUpdate({
        target: [events.organizationId, events.eventHash],
        set: {
          eventType: sql`excluded.event_type`,
          grossValueInCents: sql`excluded.gross_value_in_cents`,
          baseGrossValueInCents: sql`excluded.base_gross_value_in_cents`,
          baseNetValueInCents: sql`excluded.base_net_value_in_cents`,
          currency: sql`excluded.currency`,
          baseCurrency: sql`excluded.base_currency`,
          exchangeRate: sql`excluded.exchange_rate`,
          billingType: sql`excluded.billing_type`,
          billingReason: sql`excluded.billing_reason`,
          billingInterval: sql`excluded.billing_interval`,
          subscriptionId: sql`excluded.subscription_id`,
          createdAt: sql`excluded.created_at`,
        },
      });
    inserted += chunk.length;
  }

  return inserted;
}

export async function bulkUpsertSubscriptions(rows: SubscriptionInsert[]): Promise<number> {
  if (rows.length === 0) return 0;
  let inserted = 0;

  for (const chunk of chunks(rows, CHUNK_SIZE)) {
    await db
      .insert(subscriptions)
      .values(chunk)
      .onConflictDoUpdate({
        target: [subscriptions.subscriptionId],
        set: {
          status: sql`excluded.status`,
          canceledAt: sql`excluded.canceled_at`,
          baseCurrency: sql`excluded.base_currency`,
          exchangeRate: sql`excluded.exchange_rate`,
          baseValueInCents: sql`excluded.base_value_in_cents`,
          updatedAt: sql`now()`,
        },
      });
    inserted += chunk.length;
  }

  return inserted;
}

interface CustomerUpsertRow {
  organizationId: string;
  customerId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  eventTimestamp: Date;
}

export async function bulkUpsertCustomers(rows: CustomerUpsertRow[]): Promise<number> {
  if (rows.length === 0) return 0;

  const deduped = new Map<string, CustomerUpsertRow>();
  for (const row of rows) {
    const key = `${row.organizationId}:${row.customerId}`;
    const existing = deduped.get(key);
    if (!existing || row.eventTimestamp > existing.eventTimestamp) {
      deduped.set(key, row);
    }
  }

  const uniqueRows = Array.from(deduped.values());
  let inserted = 0;

  for (const chunk of chunks(uniqueRows, CHUNK_SIZE)) {
    await db
      .insert(customers)
      .values(
        chunk.map((r) => ({
          organizationId: r.organizationId,
          customerId: r.customerId,
          name: r.name,
          email: r.email,
          phone: r.phone,
          firstSeenAt: r.eventTimestamp,
          lastSeenAt: r.eventTimestamp,
        })),
      )
      .onConflictDoUpdate({
        target: [customers.organizationId, customers.customerId],
        set: {
          name: sql`COALESCE(excluded.name, ${customers.name})`,
          email: sql`COALESCE(excluded.email, ${customers.email})`,
          phone: sql`COALESCE(excluded.phone, ${customers.phone})`,
          lastSeenAt: sql`GREATEST(excluded.last_seen_at, ${customers.lastSeenAt})`,
          updatedAt: sql`now()`,
        },
      });
    inserted += chunk.length;
  }

  return inserted;
}
