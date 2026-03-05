"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import dayjs from "@/utils/dayjs";
import type { IRevenueComparison, IRevenueWindow } from "@/interfaces/dashboard.interface";

async function queryRevenue(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)` })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "purchase"),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate)
      )
    );
  return Number(row?.total ?? 0);
}

function buildWindow(
  label: string,
  period: IRevenueWindow["period"],
  current: number,
  previous: number
): IRevenueWindow {
  const changePercent =
    previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
  const direction: IRevenueWindow["direction"] =
    changePercent > 0.5 ? "up" : changePercent < -0.5 ? "down" : "flat";
  return { label, period, current, previous, changePercent, direction };
}

export async function getRevenueComparison(
  organizationId: string
): Promise<IRevenueComparison | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) return null;

  const tz = org.timezone ?? "America/Sao_Paulo";
  const now = dayjs().tz(tz);

  const ranges = [
    {
      label: "Semanal",
      period: "7d" as const,
      days: 7,
      cur: { start: now.subtract(6, "day").startOf("day").toDate(), end: now.endOf("day").toDate() },
      prev: { start: now.subtract(13, "day").startOf("day").toDate(), end: now.subtract(7, "day").endOf("day").toDate() },
    },
    {
      label: "Mensal",
      period: "30d" as const,
      days: 30,
      cur: { start: now.subtract(29, "day").startOf("day").toDate(), end: now.endOf("day").toDate() },
      prev: { start: now.subtract(59, "day").startOf("day").toDate(), end: now.subtract(30, "day").endOf("day").toDate() },
    },
    {
      label: "Trimestral",
      period: "90d" as const,
      days: 90,
      cur: { start: now.subtract(89, "day").startOf("day").toDate(), end: now.endOf("day").toDate() },
      prev: { start: now.subtract(179, "day").startOf("day").toDate(), end: now.subtract(90, "day").endOf("day").toDate() },
    },
  ] as const;

  const windowResults = await Promise.all(
    ranges.map(async (r) => {
      const [current, previous] = await Promise.all([
        queryRevenue(organizationId, r.cur.start, r.cur.end),
        queryRevenue(organizationId, r.prev.start, r.prev.end),
      ]);
      return buildWindow(r.label, r.period, current, previous);
    })
  );

  const recentPurchasesRows = await db
    .select({
      id: events.id,
      productName: events.productName,
      grossValueInCents: events.grossValueInCents,
      source: events.source,
      createdAt: events.createdAt,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "purchase")
      )
    )
    .orderBy(desc(events.createdAt))
    .limit(5);

  return {
    windows: windowResults,
    recentPurchases: recentPurchasesRows.map((r) => ({
      id: r.id,
      productName: r.productName,
      grossValueInCents: Number(r.grossValueInCents ?? 0),
      source: r.source,
      createdAt: r.createdAt,
    })),
  };
}
