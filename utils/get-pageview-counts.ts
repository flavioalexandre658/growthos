import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { pageviewAggregates, pageviewDailySessions, pageviewDailyPages } from "@/db/schema";
import dayjs from "@/utils/dayjs";

const RETENTION_DAYS = 30;

function toDateStr(date: Date, tz: string): string {
  return dayjs(date).tz(tz).format("YYYY-MM-DD");
}

function getCutoffDate(tz: string): string {
  return dayjs().tz(tz).subtract(RETENTION_DAYS, "days").startOf("day").format("YYYY-MM-DD");
}

export async function getPageviewSessionsByDate(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  tz: string
): Promise<Map<string, number>> {
  const startStr = toDateStr(startDate, tz);
  const endStr = toDateStr(endDate, tz);
  const cutoffStr = getCutoffDate(tz);

  const recentStart = startStr < cutoffStr ? cutoffStr : startStr;
  const historicalEnd = startStr < cutoffStr ? (endStr < cutoffStr ? endStr : dayjs(cutoffStr).subtract(1, "day").format("YYYY-MM-DD")) : null;

  const map = new Map<string, number>();

  if (historicalEnd && startStr < cutoffStr) {
    const histRows = await db
      .select({
        date: pageviewDailySessions.date,
        sessions: sql<number>`SUM(${pageviewDailySessions.sessions})`,
      })
      .from(pageviewDailySessions)
      .where(
        and(
          eq(pageviewDailySessions.organizationId, organizationId),
          gte(pageviewDailySessions.date, startStr),
          lte(pageviewDailySessions.date, historicalEnd)
        )
      )
      .groupBy(pageviewDailySessions.date);

    for (const row of histRows) {
      map.set(row.date, (map.get(row.date) ?? 0) + Number(row.sessions));
    }
  }

  const recentRows = await db
    .select({
      date: pageviewAggregates.date,
      sessions: sql<number>`COUNT(DISTINCT ${pageviewAggregates.sessionId})`,
    })
    .from(pageviewAggregates)
    .where(
      and(
        eq(pageviewAggregates.organizationId, organizationId),
        gte(pageviewAggregates.date, recentStart),
        lte(pageviewAggregates.date, endStr)
      )
    )
    .groupBy(pageviewAggregates.date);

  for (const row of recentRows) {
    map.set(row.date, (map.get(row.date) ?? 0) + Number(row.sessions));
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
  const cutoffStr = getCutoffDate(tz);

  let total = 0;

  if (startStr < cutoffStr) {
    const historicalEnd = endStr < cutoffStr ? endStr : dayjs(cutoffStr).subtract(1, "day").format("YYYY-MM-DD");
    const [histResult] = await db
      .select({
        sessions: sql<number>`COALESCE(SUM(${pageviewDailySessions.sessions}), 0)`,
      })
      .from(pageviewDailySessions)
      .where(
        and(
          eq(pageviewDailySessions.organizationId, organizationId),
          gte(pageviewDailySessions.date, startStr),
          lte(pageviewDailySessions.date, historicalEnd)
        )
      );
    total += Number(histResult?.sessions ?? 0);
  }

  const recentStart = startStr < cutoffStr ? cutoffStr : startStr;
  const [recentResult] = await db
    .select({
      sessions: sql<number>`COUNT(DISTINCT ${pageviewAggregates.sessionId})`,
    })
    .from(pageviewAggregates)
    .where(
      and(
        eq(pageviewAggregates.organizationId, organizationId),
        gte(pageviewAggregates.date, recentStart),
        lte(pageviewAggregates.date, endStr)
      )
    );

  total += Number(recentResult?.sessions ?? 0);
  return total;
}

export async function getPageviewSessionsBySource(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  tz: string
): Promise<Map<string, number>> {
  const startStr = toDateStr(startDate, tz);
  const endStr = toDateStr(endDate, tz);
  const cutoffStr = getCutoffDate(tz);

  const map = new Map<string, number>();

  if (startStr < cutoffStr) {
    const historicalEnd = endStr < cutoffStr ? endStr : dayjs(cutoffStr).subtract(1, "day").format("YYYY-MM-DD");
    const histRows = await db
      .select({
        source: sql<string>`COALESCE(${pageviewDailySessions.source}, 'direct')`,
        sessions: sql<number>`SUM(${pageviewDailySessions.sessions})`,
      })
      .from(pageviewDailySessions)
      .where(
        and(
          eq(pageviewDailySessions.organizationId, organizationId),
          gte(pageviewDailySessions.date, startStr),
          lte(pageviewDailySessions.date, historicalEnd)
        )
      )
      .groupBy(sql`COALESCE(${pageviewDailySessions.source}, 'direct')`);

    for (const row of histRows) {
      map.set(row.source, (map.get(row.source) ?? 0) + Number(row.sessions));
    }
  }

  const recentStart = startStr < cutoffStr ? cutoffStr : startStr;
  const recentRows = await db
    .select({
      source: sql<string>`COALESCE(${pageviewAggregates.source}, 'direct')`,
      sessions: sql<number>`COUNT(DISTINCT ${pageviewAggregates.sessionId})`,
    })
    .from(pageviewAggregates)
    .where(
      and(
        eq(pageviewAggregates.organizationId, organizationId),
        gte(pageviewAggregates.date, recentStart),
        lte(pageviewAggregates.date, endStr)
      )
    )
    .groupBy(sql`COALESCE(${pageviewAggregates.source}, 'direct')`);

  for (const row of recentRows) {
    map.set(row.source, (map.get(row.source) ?? 0) + Number(row.sessions));
  }

  return map;
}

export async function getPageviewSessionsByChannel(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  tz: string
): Promise<Map<string, number>> {
  const startStr = toDateStr(startDate, tz);
  const endStr = toDateStr(endDate, tz);
  const cutoffStr = getCutoffDate(tz);

  const PAID_MEDIUMS = ["cpc", "ppc", "paid", "ads", "paid_social", "display", "cpv", "cpm"];
  const paidList = PAID_MEDIUMS.map((m) => `'${m}'`).join(", ");

  const channelExprAgg = sql.raw(`CASE
    WHEN COALESCE("source", 'direct') = 'direct' AND COALESCE("medium", 'direct') = 'direct' THEN 'direct'
    WHEN COALESCE("medium", '') IN (${paidList}) THEN COALESCE("source", 'direct') || '_paid'
    ELSE COALESCE("source", 'direct') || '_organic'
  END`);

  const channelExprDaily = sql.raw(`CASE
    WHEN COALESCE(pds.source, 'direct') = 'direct' AND COALESCE(pds.medium, 'direct') = 'direct' THEN 'direct'
    WHEN COALESCE(pds.medium, '') IN (${paidList}) THEN COALESCE(pds.source, 'direct') || '_paid'
    ELSE COALESCE(pds.source, 'direct') || '_organic'
  END`);

  const map = new Map<string, number>();

  if (startStr < cutoffStr) {
    const historicalEnd = endStr < cutoffStr ? endStr : dayjs(cutoffStr).subtract(1, "day").format("YYYY-MM-DD");
    const histRows = await db.execute<{ channel: string; sessions: string }>(
      sql.raw(`
        SELECT ${channelExprDaily} AS channel, SUM(pds.sessions) AS sessions
        FROM pageview_daily_sessions pds
        WHERE pds.organization_id = '${organizationId}'
          AND pds.date >= '${startStr}'
          AND pds.date <= '${historicalEnd}'
        GROUP BY ${channelExprDaily}
      `)
    );
    for (const row of histRows.rows) {
      map.set(row.channel, (map.get(row.channel) ?? 0) + Number(row.sessions));
    }
  }

  const recentStart = startStr < cutoffStr ? cutoffStr : startStr;
  const recentRows = await db
    .select({
      channel: sql<string>`${channelExprAgg}`,
      sessions: sql<number>`COUNT(DISTINCT ${pageviewAggregates.sessionId})`,
    })
    .from(pageviewAggregates)
    .where(
      and(
        eq(pageviewAggregates.organizationId, organizationId),
        gte(pageviewAggregates.date, recentStart),
        lte(pageviewAggregates.date, endStr)
      )
    )
    .groupBy(sql`${channelExprAgg}`);

  for (const row of recentRows) {
    map.set(row.channel, (map.get(row.channel) ?? 0) + Number(row.sessions));
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
  const cutoffStr = getCutoffDate(tz);

  const map = new Map<string, number>();

  if (startStr < cutoffStr) {
    const historicalEnd = endStr < cutoffStr ? endStr : dayjs(cutoffStr).subtract(1, "day").format("YYYY-MM-DD");
    const histRows = await db
      .select({
        page: pageviewDailySessions.entryPage,
        sessions: sql<number>`SUM(${pageviewDailySessions.sessions})`,
      })
      .from(pageviewDailySessions)
      .where(
        and(
          eq(pageviewDailySessions.organizationId, organizationId),
          gte(pageviewDailySessions.date, startStr),
          lte(pageviewDailySessions.date, historicalEnd),
          sql`${pageviewDailySessions.entryPage} != ''`
        )
      )
      .groupBy(pageviewDailySessions.entryPage);

    for (const row of histRows) {
      if (row.page) map.set(row.page, (map.get(row.page) ?? 0) + Number(row.sessions));
    }
  }

  const recentStart = startStr < cutoffStr ? cutoffStr : startStr;
  const recentRows = await db
    .select({
      page: pageviewAggregates.entryPage,
      sessions: sql<number>`COUNT(DISTINCT ${pageviewAggregates.sessionId})`,
    })
    .from(pageviewAggregates)
    .where(
      and(
        eq(pageviewAggregates.organizationId, organizationId),
        gte(pageviewAggregates.date, recentStart),
        lte(pageviewAggregates.date, endStr),
        sql`${pageviewAggregates.entryPage} IS NOT NULL`
      )
    )
    .groupBy(pageviewAggregates.entryPage);

  for (const row of recentRows) {
    if (row.page) map.set(row.page, (map.get(row.page) ?? 0) + Number(row.sessions));
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
  const cutoffStr = getCutoffDate(tz);

  const map = new Map<string, number>();

  if (startStr < cutoffStr) {
    const historicalEnd = endStr < cutoffStr ? endStr : dayjs(cutoffStr).subtract(1, "day").format("YYYY-MM-DD");
    const histRows = await db
      .select({
        page: pageviewDailyPages.landingPage,
        sessions: sql<number>`SUM(${pageviewDailyPages.sessions})`,
      })
      .from(pageviewDailyPages)
      .where(
        and(
          eq(pageviewDailyPages.organizationId, organizationId),
          gte(pageviewDailyPages.date, startStr),
          lte(pageviewDailyPages.date, historicalEnd),
          sql`${pageviewDailyPages.landingPage} != ''`
        )
      )
      .groupBy(pageviewDailyPages.landingPage);

    for (const row of histRows) {
      if (row.page) map.set(row.page, (map.get(row.page) ?? 0) + Number(row.sessions));
    }
  }

  const recentStart = startStr < cutoffStr ? cutoffStr : startStr;
  const recentRows = await db
    .select({
      page: pageviewAggregates.landingPage,
      sessions: sql<number>`COUNT(DISTINCT ${pageviewAggregates.sessionId})`,
    })
    .from(pageviewAggregates)
    .where(
      and(
        eq(pageviewAggregates.organizationId, organizationId),
        gte(pageviewAggregates.date, recentStart),
        lte(pageviewAggregates.date, endStr),
        sql`${pageviewAggregates.landingPage} IS NOT NULL`
      )
    )
    .groupBy(pageviewAggregates.landingPage);

  for (const row of recentRows) {
    if (row.page) map.set(row.page, (map.get(row.page) ?? 0) + Number(row.sessions));
  }

  return map;
}
