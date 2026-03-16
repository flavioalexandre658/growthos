import { getRedis } from "@/lib/redis";
import { db } from "@/db";
import { events, deadLetterEvents } from "@/db/schema";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { invalidateOrgDashboardCache } from "@/lib/cache";
import type { events as eventsTable } from "@/db/schema";

const BUFFER_KEY = "buffer:failed-events";
const MAX_BATCH_SIZE = 100;
const DEAD_LETTER_AGE_MS = 60 * 60 * 1000;

type EventInsert = typeof eventsTable.$inferInsert;

export interface BufferedFailedEvent {
  organizationId: string;
  eventRow: EventInsert;
  paymentRow: Record<string, unknown> | null;
  customerData: {
    customerId: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
  } | null;
  error: string;
  attempts: number;
  firstFailedAt: number;
}

export async function bufferFailedEvent(entry: BufferedFailedEvent): Promise<void> {
  try {
    await getRedis().rpush(BUFFER_KEY, JSON.stringify(entry));
  } catch (err) {
    console.error("[event-fail-buffer] Failed to buffer event to Redis:", err instanceof Error ? err.message : String(err));
  }
}

export async function flushFailedEventBuffer(): Promise<{ processed: number; requeued: number; deadLettered: number }> {
  const redis = getRedis();
  const items: string[] = [];

  for (let i = 0; i < MAX_BATCH_SIZE; i++) {
    const item = await redis.lpop(BUFFER_KEY);
    if (!item) break;
    items.push(item);
  }

  if (items.length === 0) return { processed: 0, requeued: 0, deadLettered: 0 };

  let processed = 0;
  let requeued = 0;
  let deadLettered = 0;

  for (const raw of items) {
    let entry: BufferedFailedEvent;
    try {
      entry = JSON.parse(raw) as BufferedFailedEvent;
    } catch {
      continue;
    }

    try {
      const inserted = await db
        .insert(events)
        .values(entry.eventRow)
        .onConflictDoNothing({ target: [events.organizationId, events.eventHash] })
        .returning({ id: events.id });

      if (inserted.length > 0 && entry.paymentRow) {
        insertPayment(entry.paymentRow as Parameters<typeof insertPayment>[0]).catch((err) => {
          console.error("[event-fail-buffer] insertPayment failed:", err instanceof Error ? err.message : String(err));
        });
      }

      if (inserted.length > 0 && entry.customerData) {
        upsertCustomer({
          organizationId: entry.organizationId,
          customerId: entry.customerData.customerId,
          name: entry.customerData.name,
          email: entry.customerData.email,
          phone: entry.customerData.phone,
          country: entry.customerData.country,
          region: entry.customerData.region,
          city: entry.customerData.city,
          eventTimestamp: entry.eventRow.createdAt instanceof Date ? entry.eventRow.createdAt : new Date(entry.eventRow.createdAt as unknown as string),
        }).catch((err) => {
          console.error("[event-fail-buffer] upsertCustomer failed:", err instanceof Error ? err.message : String(err));
        });
      }

      if (inserted.length > 0) {
        invalidateOrgDashboardCache(entry.organizationId).catch(() => {});
      }

      processed++;
    } catch (err) {
      const age = Date.now() - entry.firstFailedAt;

      if (age >= DEAD_LETTER_AGE_MS) {
        try {
          await db.insert(deadLetterEvents).values({
            organizationId: entry.organizationId,
            eventType: String(entry.eventRow.eventType ?? "unknown"),
            payload: entry.eventRow as Record<string, unknown>,
            errorMessage: err instanceof Error ? err.message : String(err),
            attempts: entry.attempts + 1,
            firstFailedAt: new Date(entry.firstFailedAt),
            lastFailedAt: new Date(),
          });
          deadLettered++;
        } catch (dlErr) {
          console.error("[event-fail-buffer] Dead letter insert failed:", dlErr instanceof Error ? dlErr.message : String(dlErr));
          await redis.rpush(BUFFER_KEY, raw).catch(() => {});
          requeued++;
        }
      } else {
        entry.attempts++;
        entry.error = err instanceof Error ? err.message : String(err);
        await redis.rpush(BUFFER_KEY, JSON.stringify(entry)).catch(() => {});
        requeued++;
      }
    }
  }

  if (processed > 0 || deadLettered > 0) {
    console.log(`[event-fail-buffer] Flushed: ${processed} processed, ${requeued} requeued, ${deadLettered} dead-lettered`);
  }

  return { processed, requeued, deadLettered };
}
