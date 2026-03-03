import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { pageviewAggregates } from "@/db/schema";
import dayjs from "@/utils/dayjs";

function toDateStr(date: Date, tz: string): string {
  return dayjs(date).tz(tz).format("YYYY-MM-DD");
}

export async function getPageviewSessionsByDate(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  tz: string
): Promise<Map<string, number>> {
  const startStr = toDateStr(startDate, tz);
  const endStr = toDateStr(endDate, tz);

  const rows = await db
    .select({
      date: pageviewAggregates.date,
      sessions: sql<number>`COUNT(DISTINCT ${pageviewAggregates.sessionId})`,
    })
    .from(pageviewAggregates)
    .where(
      and(
        eq(pageviewAggregates.organizationId, organizationId),
        gte(pageviewAggregates.date, startStr),
        lte(pageviewAggregates.date, endStr)
      )
    )
    .groupBy(pageviewAggregates.date);

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
  tz: string
): Promise<number> {
  const startStr = toDateStr(startDate, tz);
  const endStr = toDateStr(endDate, tz);

  const [result] = await db
    .select({
      sessions: sql<number>`COUNT(DISTINCT ${pageviewAggregates.sessionId})`,
    })
    .from(pageviewAggregates)
    .where(
      and(
        eq(pageviewAggregates.organizationId, organizationId),
        gte(pageviewAggregates.date, startStr),
        lte(pageviewAggregates.date, endStr)
      )
    );

  return Number(result?.sessions ?? 0);
}

export async function getPageviewSessionsBySource(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  tz: string
): Promise<Map<string, number>> {
  const startStr = toDateStr(startDate, tz);
  const endStr = toDateStr(endDate, tz);

  const rows = await db
    .select({
      source: sql<string>`COALESCE(${pageviewAggregates.source}, 'direct')`,
      sessions: sql<number>`COUNT(DISTINCT ${pageviewAggregates.sessionId})`,
    })
    .from(pageviewAggregates)
    .where(
      and(
        eq(pageviewAggregates.organizationId, organizationId),
        gte(pageviewAggregates.date, startStr),
        lte(pageviewAggregates.date, endStr)
      )
    )
    .groupBy(sql`COALESCE(${pageviewAggregates.source}, 'direct')`);

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.source, Number(row.sessions));
  }
  return map;
}

export async function getPageviewSessionsByEntryPage(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  tz: string
): Promise<Map<string, number>> {
  const startStr = toDateStr(startDate, tz);
  const endStr = toDateStr(endDate, tz);

  const rows = await db
    .select({
      page: pageviewAggregates.entryPage,
      sessions: sql<number>`COUNT(DISTINCT ${pageviewAggregates.sessionId})`,
    })
    .from(pageviewAggregates)
    .where(
      and(
        eq(pageviewAggregates.organizationId, organizationId),
        gte(pageviewAggregates.date, startStr),
        lte(pageviewAggregates.date, endStr),
        sql`${pageviewAggregates.entryPage} IS NOT NULL`
      )
    )
    .groupBy(pageviewAggregates.entryPage);

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
  tz: string
): Promise<Map<string, number>> {
  const startStr = toDateStr(startDate, tz);
  const endStr = toDateStr(endDate, tz);

  const rows = await db
    .select({
      page: pageviewAggregates.landingPage,
      sessions: sql<number>`COUNT(DISTINCT ${pageviewAggregates.sessionId})`,
    })
    .from(pageviewAggregates)
    .where(
      and(
        eq(pageviewAggregates.organizationId, organizationId),
        gte(pageviewAggregates.date, startStr),
        lte(pageviewAggregates.date, endStr),
        sql`${pageviewAggregates.landingPage} IS NOT NULL`
      )
    )
    .groupBy(pageviewAggregates.landingPage);

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.page) map.set(row.page, Number(row.sessions));
  }
  return map;
}
