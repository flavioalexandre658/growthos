"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import type { IDateFilter, IGenericFunnelData } from "@/interfaces/dashboard.interface";

export async function getFunnel(
  organizationId: string,
  filter: IDateFilter = {}
): Promise<IGenericFunnelData | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const { startDate, endDate } = resolveDateRange(filter);

  const [org] = await db
    .select({ funnelSteps: organizations.funnelSteps })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) return null;

  const funnelSteps = org.funnelSteps;
  const allEventTypes = funnelSteps.map((s) => s.eventType);

  const eventRows = await db
    .select({
      eventType: events.eventType,
      total: sql<number>`COUNT(*)`,
      uniqueTotal: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate),
        sql`${events.eventType} = ANY(${allEventTypes})`
      )
    )
    .groupBy(events.eventType);

  const countMap = new Map(
    eventRows.map((r) => [
      r.eventType,
      { total: Number(r.total), uniqueTotal: Number(r.uniqueTotal) },
    ])
  );

  const revenueResult = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(${events.grossValueInCents}), 0)`,
      netRevenue: sql<number>`COALESCE(SUM(${events.netValueInCents}), 0)`,
      payments: sql<number>`COUNT(*)`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "payment"),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate)
      )
    );

  const revenue = revenueResult[0] ?? { grossRevenue: 0, netRevenue: 0, payments: 0 };
  const grossRevenue = Number(revenue.grossRevenue);
  const netRevenue = Number(revenue.netRevenue);
  const paymentCount = Number(revenue.payments);

  const steps = funnelSteps.map((step) => {
    const counts = countMap.get(step.eventType);
    const value = step.countUnique
      ? (counts?.uniqueTotal ?? 0)
      : (counts?.total ?? 0);
    return {
      key: step.eventType,
      label: step.label,
      value,
    };
  });

  const rates: IGenericFunnelData["rates"] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const from = steps[i];
    const to = steps[i + 1];
    const rate = from.value > 0 ? ((to.value / from.value) * 100).toFixed(1) + "%" : "0%";
    rates.push({ key: `${from.key}_to_${to.key}`, label: `${from.label} → ${to.label}`, value: rate });
  }

  if (steps.length >= 3) {
    const first = steps[0];
    const last = steps[steps.length - 1];
    const totalRate = first.value > 0 ? ((last.value / first.value) * 100).toFixed(1) + "%" : "0%";
    rates.push({ key: "total_conversion", label: "Conversão Total", value: totalRate });
  }

  const ticketMedio = paymentCount > 0
    ? `R$ ${(grossRevenue / 100 / paymentCount).toFixed(2).replace(".", ",")}`
    : "R$ 0,00";

  const margin = grossRevenue > 0
    ? ((netRevenue / grossRevenue) * 100).toFixed(1) + "%"
    : "0%";

  return {
    steps,
    rates,
    revenue: grossRevenue,
    netRevenue,
    ticketMedio,
    margin,
  };
}
