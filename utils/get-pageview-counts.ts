import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import dayjs from "@/utils/dayjs";

function toRange(startDate: Date, endDate: Date, tz: string): { start: Date; end: Date } {
  const start = dayjs(startDate).tz(tz).startOf("day").toDate();
  const end = dayjs(endDate).tz(tz).endOf("day").toDate();
  return { start, end };
}

export async function getPageviewSessionsByDate(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  tz: string,
): Promise<Map<string, number>> {
  const { start, end } = toRange(startDate, endDate, tz);

  const rows = await db
    .select({
      date: sql<string>`TO_CHAR(${events.createdAt} AT TIME ZONE ${tz}, 'YYYY-MM-DD')`,
      sessions: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "pageview"),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
      ),
    )
    .groupBy(sql`TO_CHAR(${events.createdAt} AT TIME ZONE ${tz}, 'YYYY-MM-DD')`);

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.date, Number(row.sessions));
  }
  return map;
}

export async function getPageviewTotalSessions(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  tz: string,
): Promise<number> {
  const { start, end } = toRange(startDate, endDate, tz);

  const [row] = await db
    .select({
      sessions: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "pageview"),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
      ),
    );

  return Number(row?.sessions ?? 0);
}

export async function getPageviewSessionsBySource(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  tz: string,
): Promise<Map<string, number>> {
  const { start, end } = toRange(startDate, endDate, tz);

  const rows = await db
    .select({
      source: sql<string>`COALESCE(${events.source}, 'direct')`,
      sessions: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "pageview"),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
      ),
    )
    .groupBy(sql`COALESCE(${events.source}, 'direct')`);

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.source, Number(row.sessions));
  }
  return map;
}

export async function getPageviewSessionsByChannel(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  tz: string,
): Promise<Map<string, number>> {
  const { start, end } = toRange(startDate, endDate, tz);

  const PAID_MEDIUMS = ["cpc", "ppc", "paid", "ads", "paid_social", "display", "cpv", "cpm"];
  const paidList = PAID_MEDIUMS.map((m) => `'${m}'`).join(", ");

  const channelExpr = sql.raw(`CASE
    WHEN COALESCE("source", 'direct') = 'direct' AND COALESCE("medium", 'direct') = 'direct' THEN 'direct'
    WHEN COALESCE("medium", '') IN (${paidList}) THEN COALESCE("source", 'direct') || '_paid'
    ELSE COALESCE("source", 'direct') || '_organic'
  END`);

  const rows = await db
    .select({
      channel: sql<string>`${channelExpr}`,
      sessions: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "pageview"),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
      ),
    )
    .groupBy(sql`${channelExpr}`);

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.channel, Number(row.sessions));
  }
  return map;
}

export async function getPageviewSessionsByEntryPage(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  tz: string,
): Promise<Map<string, number>> {
  const { start, end } = toRange(startDate, endDate, tz);

  const rows = await db
    .select({
      page: events.entryPage,
      sessions: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "pageview"),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
        sql`${events.entryPage} IS NOT NULL AND ${events.entryPage} != ''`,
      ),
    )
    .groupBy(events.entryPage);

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.page) map.set(row.page, Number(row.sessions));
  }
  return map;
}

export async function getPageviewSessionsByLandingPage(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  tz: string,
): Promise<Map<string, number>> {
  const { start, end } = toRange(startDate, endDate, tz);

  const rows = await db
    .select({
      page: events.landingPage,
      sessions: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "pageview"),
        gte(events.createdAt, start),
        lte(events.createdAt, end),
        sql`${events.landingPage} IS NOT NULL AND ${events.landingPage} != ''`,
      ),
    )
    .groupBy(events.landingPage);

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.page) map.set(row.page, Number(row.sessions));
  }
  return map;
}
