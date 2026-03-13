import { getRedis } from "@/lib/redis";
import { db } from "@/db";
import { pageviewAggregates } from "@/db/schema";
import { sql } from "drizzle-orm";

const BUFFER_KEY = "buffer:pageviews";
const FLUSH_INTERVAL_MS = 7_000;
const MAX_BATCH_SIZE = 500;

interface BufferedPageview {
  organizationId: string;
  date: string;
  sessionId: string;
  landingPage: string | null;
  entryPage: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  device: string | null;
  referrer: string | null;
}

export async function bufferPageview(pv: BufferedPageview): Promise<void> {
  try {
    await getRedis().rpush(BUFFER_KEY, JSON.stringify(pv));
  } catch {
    await directInsertPageview(pv);
  }
}

async function directInsertPageview(pv: BufferedPageview): Promise<void> {
  await db
    .insert(pageviewAggregates)
    .values({
      organizationId: pv.organizationId,
      date: pv.date,
      sessionId: pv.sessionId,
      landingPage: pv.landingPage,
      entryPage: pv.entryPage,
      source: pv.source,
      medium: pv.medium,
      campaign: pv.campaign,
      content: pv.content,
      device: pv.device,
      referrer: pv.referrer,
      pageviews: 1,
    })
    .onConflictDoUpdate({
      target: [
        pageviewAggregates.organizationId,
        pageviewAggregates.date,
        pageviewAggregates.sessionId,
        pageviewAggregates.landingPage,
      ],
      set: {
        pageviews: sql`${pageviewAggregates.pageviews} + 1`,
      },
    });
}

export async function flushPageviewBuffer(): Promise<number> {
  const redis = getRedis();
  const items: string[] = [];

  for (let i = 0; i < MAX_BATCH_SIZE; i++) {
    const item = await redis.lpop(BUFFER_KEY);
    if (!item) break;
    items.push(item);
  }

  if (items.length === 0) return 0;

  const aggregated = new Map<string, { pv: BufferedPageview; count: number }>();

  for (const raw of items) {
    const pv = JSON.parse(raw) as BufferedPageview;
    const key = `${pv.organizationId}|${pv.date}|${pv.sessionId}|${pv.landingPage ?? ""}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.count++;
    } else {
      aggregated.set(key, { pv, count: 1 });
    }
  }

  for (const { pv, count } of aggregated.values()) {
    await db
      .insert(pageviewAggregates)
      .values({
        organizationId: pv.organizationId,
        date: pv.date,
        sessionId: pv.sessionId,
        landingPage: pv.landingPage,
        entryPage: pv.entryPage,
        source: pv.source,
        medium: pv.medium,
        campaign: pv.campaign,
        content: pv.content,
        device: pv.device,
        referrer: pv.referrer,
        pageviews: count,
      })
      .onConflictDoUpdate({
        target: [
          pageviewAggregates.organizationId,
          pageviewAggregates.date,
          pageviewAggregates.sessionId,
          pageviewAggregates.landingPage,
        ],
        set: {
          pageviews: sql`${pageviewAggregates.pageviews} + ${count}`,
        },
      })
      .catch((err) => {
        console.error("[pageview-buffer] flush upsert failed:", err);
      });
  }

  return items.length;
}

let _flushTimer: ReturnType<typeof setInterval> | null = null;

export function startPageviewFlushTimer(): void {
  if (_flushTimer) return;
  _flushTimer = setInterval(async () => {
    try {
      const count = await flushPageviewBuffer();
      if (count > 0) {
        console.log(`[pageview-buffer] Flushed ${count} pageviews`);
      }
    } catch (err) {
      console.error("[pageview-buffer] Flush error:", err);
    }
  }, FLUSH_INTERVAL_MS);
}

export function stopPageviewFlushTimer(): void {
  if (_flushTimer) {
    clearInterval(_flushTimer);
    _flushTimer = null;
  }
}
