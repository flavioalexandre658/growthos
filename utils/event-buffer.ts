import { getRedis } from "@/lib/redis";
import { db } from "@/db";
import { events } from "@/db/schema";

const BUFFER_KEY = "buffer:events";
const LOCK_KEY = "lock:flush:events";
const LOCK_TTL_SECONDS = 30;
const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH_SIZE = 500;

type EventInsert = typeof events.$inferInsert;

type SerializableEventInsert = Omit<EventInsert, "createdAt"> & {
  createdAt?: string | Date;
};

function serialize(row: EventInsert): SerializableEventInsert {
  return {
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

function deserialize(raw: SerializableEventInsert): EventInsert {
  return {
    ...raw,
    createdAt:
      typeof raw.createdAt === "string" ? new Date(raw.createdAt) : raw.createdAt,
  };
}

export async function bufferEventInsert(row: EventInsert): Promise<void> {
  try {
    await getRedis().rpush(BUFFER_KEY, JSON.stringify(serialize(row)));
  } catch {
    await directInsertEvent(row);
  }
}

async function directInsertEvent(row: EventInsert): Promise<void> {
  await db
    .insert(events)
    .values(row)
    .onConflictDoNothing({ target: [events.organizationId, events.eventHash] });
}

async function acquireLock(): Promise<boolean> {
  try {
    const result = await getRedis().set(LOCK_KEY, "1", "EX", LOCK_TTL_SECONDS, "NX");
    return result === "OK";
  } catch {
    return false;
  }
}

async function releaseLock(): Promise<void> {
  try {
    await getRedis().del(LOCK_KEY);
  } catch {
    // lock will expire via TTL
  }
}

export async function flushEventBuffer(): Promise<number> {
  const locked = await acquireLock();
  if (!locked) return 0;

  try {
    const redis = getRedis();
    const items: string[] = [];

    for (let i = 0; i < MAX_BATCH_SIZE; i++) {
      const item = await redis.lpop(BUFFER_KEY);
      if (!item) break;
      items.push(item);
    }

    if (items.length === 0) return 0;

    const rows: EventInsert[] = [];
    for (const raw of items) {
      try {
        rows.push(deserialize(JSON.parse(raw) as SerializableEventInsert));
      } catch (err) {
        console.error("[event-buffer] dropped corrupt entry", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (rows.length === 0) return 0;

    try {
      await db
        .insert(events)
        .values(rows)
        .onConflictDoNothing({ target: [events.organizationId, events.eventHash] });
      return rows.length;
    } catch (err) {
      console.error("[event-buffer] batch insert failed, requeueing", {
        batchSize: rows.length,
        error: err instanceof Error ? err.message : String(err),
      });
      const pipeline = redis.pipeline();
      for (const raw of items) {
        pipeline.rpush(BUFFER_KEY, raw);
      }
      await pipeline.exec().catch(() => {});
      return 0;
    }
  } finally {
    await releaseLock();
  }
}

let _flushTimer: ReturnType<typeof setInterval> | null = null;

export function startEventFlushTimer(): void {
  if (_flushTimer) return;
  _flushTimer = setInterval(async () => {
    try {
      const count = await flushEventBuffer();
      if (count > 0) {
        console.log(`[event-buffer] Flushed ${count} events`);
      }
    } catch (err) {
      console.error("[event-buffer] Flush error:", err);
    }
  }, FLUSH_INTERVAL_MS);
}

export function stopEventFlushTimer(): void {
  if (_flushTimer) {
    clearInterval(_flushTimer);
    _flushTimer = null;
  }
}
