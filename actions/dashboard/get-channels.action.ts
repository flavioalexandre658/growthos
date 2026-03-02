"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import {
  buildFunnelSteps,
  getAllQueryEventTypes,
  injectCheckoutSteps,
  buildExtendedStepMeta,
} from "@/utils/build-funnel-steps";
import type {
  IDateFilter,
  IChannelParams,
  IChannelData,
  IChannelsResult,
} from "@/interfaces/dashboard.interface";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

export async function getChannels(
  organizationId: string,
  params: IChannelParams = {}
): Promise<IChannelsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { data: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }, stepMeta: [] };
  }

  const { startDate, endDate } = resolveDateRange(params);
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const orderBy = params.order_by ?? "revenue";

  const [org] = await db
    .select({ funnelSteps: organizations.funnelSteps })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const baseFunnelSteps: IFunnelStepConfig[] = buildFunnelSteps(org?.funnelSteps ?? []);
  const allEventTypes = getAllQueryEventTypes(baseFunnelSteps);

  const rawRows = await db
    .select({
      channel: sql<string>`COALESCE(${events.source}, 'direct')`,
      eventType: events.eventType,
      total: sql<number>`COUNT(*)`,
      uniqueTotal: sql<number>`COUNT(DISTINCT ${events.sessionId})`,
      grossRev: sql<number>`COALESCE(SUM(${events.grossValueInCents}), 0)`,
    })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        gte(events.createdAt, startDate),
        lte(events.createdAt, endDate),
        inArray(events.eventType, allEventTypes)
      )
    )
    .groupBy(sql`COALESCE(${events.source}, 'direct')`, events.eventType);

  const globalCountMap = new Map<string, { total: number; uniqueTotal: number }>();
  for (const row of rawRows) {
    const existing = globalCountMap.get(row.eventType) ?? { total: 0, uniqueTotal: 0 };
    globalCountMap.set(row.eventType, {
      total: existing.total + Number(row.total),
      uniqueTotal: existing.uniqueTotal + Number(row.uniqueTotal),
    });
  }

  const funnelSteps = injectCheckoutSteps(baseFunnelSteps, globalCountMap);
  const stepMeta = buildExtendedStepMeta(funnelSteps, globalCountMap);
  const stepConfigMap = new Map(funnelSteps.map((s) => [s.eventType, s]));
  const trackedInMeta = new Set(stepMeta.map((m) => m.key));

  const channelMap = new Map<
    string,
    { steps: Record<string, number>; revenue: number; paymentCount: number }
  >();

  for (const row of rawRows) {
    if (!channelMap.has(row.channel)) {
      channelMap.set(row.channel, { steps: {}, revenue: 0, paymentCount: 0 });
    }
    const entry = channelMap.get(row.channel)!;

    const stepConfig = stepConfigMap.get(row.eventType);
    if (stepConfig) {
      const count = stepConfig.countUnique
        ? Number(row.uniqueTotal)
        : Number(row.total);
      entry.steps[row.eventType] = count;
    } else if (row.eventType === "checkout_abandoned" && trackedInMeta.has("checkout_abandoned")) {
      entry.steps["checkout_abandoned"] = Number(row.total);
    }

    if (row.eventType === "payment") {
      entry.revenue = Number(row.grossRev);
      entry.paymentCount = Number(row.total);
    }
  }

  const allChannels: IChannelData[] = Array.from(channelMap.entries()).map(
    ([channel, data]) => {
      const firstStepKey = funnelSteps[0]?.eventType;
      const lastStepKey = funnelSteps[funnelSteps.length - 1]?.eventType;
      const firstCount = firstStepKey ? (data.steps[firstStepKey] ?? 0) : 0;
      const lastCount = lastStepKey ? (data.steps[lastStepKey] ?? 0) : data.paymentCount;
      const conversionRate =
        firstCount > 0 ? ((lastCount / firstCount) * 100).toFixed(1) + "%" : "0%";
      const ticketMedio = data.paymentCount > 0 ? data.revenue / data.paymentCount : 0;

      return {
        channel,
        steps: data.steps,
        revenue: data.revenue,
        ticket_medio: ticketMedio,
        conversion_rate: conversionRate,
      };
    }
  );

  const sorted = [...allChannels].sort((a, b) => {
    if (orderBy === "revenue") return b.revenue - a.revenue;
    if (orderBy === "conversion_rate") {
      return parseFloat(b.conversion_rate) - parseFloat(a.conversion_rate);
    }
    if (orderBy === "ticket_medio") return b.ticket_medio - a.ticket_medio;
    const aVal = a.steps[orderBy] ?? 0;
    const bVal = b.steps[orderBy] ?? 0;
    return bVal - aVal;
  });

  if (params.order_dir === "ASC") sorted.reverse();

  const total = sorted.length;
  const offset = (page - 1) * limit;
  const data = sorted.slice(offset, offset + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    stepMeta,
  };
}
