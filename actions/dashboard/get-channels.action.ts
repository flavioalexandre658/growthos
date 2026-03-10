"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import { db } from "@/db";
import { events, organizations, payments, marketingSpends } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import { getUserPlan } from "@/utils/get-user-plan";
import { getPageviewSessionsByChannel } from "@/utils/get-pageview-counts";
import dayjs from "@/utils/dayjs";
import {
  buildFunnelSteps,
  getAllQueryEventTypes,
  injectCheckoutSteps,
  buildExtendedStepMeta,
} from "@/utils/build-funnel-steps";
import { getChannelName } from "@/utils/channel-colors";
import { getSourceForChannelKey, getChannelKeysForSource, isGroupedSource, getMarketingSourceLabel, SOURCE_GROUPS } from "@/utils/marketing-sources";
import type {
  IDateFilter,
  IChannelParams,
  IChannelData,
  IChannelsResult,
  IChannelInvestmentGroup,
} from "@/interfaces/dashboard.interface";
import type { IFunnelStepConfig } from "@/db/schema/organization.schema";

const SOURCE_ALIASES: Record<string, string> = {
  fb: "facebook",
  fbads: "facebook",
  ig: "instagram",
  yt: "youtube",
  adwords: "google",
  gads: "google",
  tw: "twitter",
  x: "twitter",
  openai: "chatgpt",
  "chat.openai": "chatgpt",
};

function normalizeSource(source: string): string {
  const lower = source.toLowerCase().replace(/[\s-]/g, "_");
  if (SOURCE_ALIASES[lower]) return SOURCE_ALIASES[lower];
  for (const [alias, normalized] of Object.entries(SOURCE_ALIASES)) {
    if (lower === alias) return normalized;
  }
  return lower;
}

function normalizeChannel(channel: string): string {
  if (channel === "direct") return "direct";
  const lastUnderscore = channel.lastIndexOf("_");
  if (lastUnderscore === -1) return channel;
  const suffix = channel.slice(lastUnderscore + 1);
  const source = channel.slice(0, lastUnderscore);
  if (suffix !== "paid" && suffix !== "organic") return channel;
  return normalizeSource(source) + "_" + suffix;
}

export async function getChannels(
  organizationId: string,
  params: IChannelParams = {},
  urlLocale?: string
): Promise<IChannelsResult> {
  const EMPTY: IChannelsResult = {
    data: [],
    pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
    stepMeta: [],
    totalRevenue: 0,
    channelsWithRevenue: 0,
    topChannel: "",
    concentrationTop2: 0,
    investmentGroups: [],
  };

  const session = await getServerSession(authOptions);
  if (!session?.user) return EMPTY;
  const locale = urlLocale ?? session.user.locale ?? "pt";

  const [org] = await db
    .select({ funnelSteps: organizations.funnelSteps, timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const plan = await getUserPlan();
  const { startDate, endDate } = resolveDateRange(params, tz, plan.maxHistoryDays);
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const orderBy = params.order_by ?? "revenue";

  const periodMs = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(startDate.getTime() - periodMs);

  const baseFunnelSteps: IFunnelStepConfig[] = buildFunnelSteps(org?.funnelSteps ?? [], locale);
  const allEventTypes = getAllQueryEventTypes(baseFunnelSteps).filter(
    (t) => t !== "pageview"
  );

  const PAID_MEDIUMS = ["cpc", "ppc", "paid", "ads", "paid_social", "display", "cpv", "cpm"];
  const paidList = PAID_MEDIUMS.map((m) => `'${m}'`).join(", ");

  const channelExpr = sql.raw(`CASE
    WHEN COALESCE("source", 'direct') = 'direct' AND COALESCE("medium", 'direct') = 'direct' THEN 'direct'
    WHEN COALESCE("medium", '') IN (${paidList}) THEN COALESCE("source", 'direct') || '_paid'
    ELSE COALESCE("source", 'direct') || '_organic'
  END`);

  const channelExprPayments = sql.raw(`CASE
    WHEN COALESCE("source", 'direct') = 'direct' AND COALESCE("medium", 'direct') = 'direct' THEN 'direct'
    WHEN COALESCE("medium", '') IN (${paidList}) THEN COALESCE("source", 'direct') || '_paid'
    ELSE COALESCE("source", 'direct') || '_organic'
  END`);

  const [rawRows, prevRawRows, marketingRows] = await Promise.all([
    db
      .select({
        channel: sql<string>`${channelExpr}`,
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
          inArray(events.eventType, allEventTypes)
        )
      )
      .groupBy(sql`${channelExpr}`, events.eventType),

    db
      .select({
        channel: sql<string>`${channelExprPayments}`,
        grossRev: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, organizationId),
          gte(payments.createdAt, previousStartDate),
          lte(payments.createdAt, previousEndDate),
          inArray(payments.eventType, REVENUE_EVENT_TYPES)
        )
      )
      .groupBy(sql`${channelExprPayments}`),

    db
      .select({
        source: marketingSpends.source,
        sourceLabel: marketingSpends.sourceLabel,
        totalAmountInCents: sql<number>`COALESCE(SUM(${marketingSpends.amountInCents}), 0)`,
      })
      .from(marketingSpends)
      .where(
        and(
          eq(marketingSpends.organizationId, organizationId),
          gte(marketingSpends.spentAt, dayjs(startDate).tz(tz).format("YYYY-MM-DD")),
          lte(marketingSpends.spentAt, dayjs(endDate).tz(tz).format("YYYY-MM-DD"))
        )
      )
      .groupBy(marketingSpends.source, marketingSpends.sourceLabel),
  ]);

  const revenueRows = await db
    .select({
      channel: sql<string>`${channelExprPayments}`,
      eventType: payments.eventType,
      grossRev: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
      purchaseCount: sql<number>`COUNT(*)`,
    })
    .from(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        gte(payments.createdAt, startDate),
        lte(payments.createdAt, endDate),
        inArray(payments.eventType, REVENUE_EVENT_TYPES)
      )
    )
    .groupBy(sql`${channelExprPayments}`, payments.eventType);

  const pvBySource = await getPageviewSessionsByChannel(
    organizationId,
    startDate,
    endDate,
    tz
  );

  const previousRevenueMap = new Map<string, number>();
  for (const row of prevRawRows) {
    const normalized = normalizeChannel(row.channel);
    const existing = previousRevenueMap.get(normalized) ?? 0;
    previousRevenueMap.set(normalized, existing + Number(row.grossRev));
  }

  const globalCountMap = new Map<string, { total: number; uniqueTotal: number }>();
  for (const row of rawRows) {
    const existing = globalCountMap.get(row.eventType) ?? { total: 0, uniqueTotal: 0 };
    globalCountMap.set(row.eventType, {
      total: existing.total + Number(row.total),
      uniqueTotal: existing.uniqueTotal + Number(row.uniqueTotal),
    });
  }
  const totalPv = Array.from(pvBySource.values()).reduce((sum, n) => sum + n, 0);
  globalCountMap.set("pageview", { total: totalPv, uniqueTotal: totalPv });

  const funnelSteps = injectCheckoutSteps(baseFunnelSteps, globalCountMap, locale);
  const stepMeta = buildExtendedStepMeta(funnelSteps, globalCountMap, locale);
  const stepConfigMap = new Map(funnelSteps.map((s) => [s.eventType, s]));
  const trackedInMeta = new Set(stepMeta.map((m) => m.key));

  const channelMap = new Map<
    string,
    { steps: Record<string, number>; revenue: number; purchaseCount: number }
  >();

  for (const row of rawRows) {
    const normalizedChannel = normalizeChannel(row.channel);
    if (!channelMap.has(normalizedChannel)) {
      channelMap.set(normalizedChannel, { steps: {}, revenue: 0, purchaseCount: 0 });
    }
    const entry = channelMap.get(normalizedChannel)!;

    const stepConfig = stepConfigMap.get(row.eventType);
    if (stepConfig) {
      const count = stepConfig.countUnique
        ? Number(row.uniqueTotal)
        : Number(row.total);
      entry.steps[row.eventType] = (entry.steps[row.eventType] ?? 0) + count;
    } else if (row.eventType === "checkout_abandoned" && trackedInMeta.has("checkout_abandoned")) {
      entry.steps["checkout_abandoned"] = (entry.steps["checkout_abandoned"] ?? 0) + Number(row.total);
    }
  }

  for (const row of revenueRows) {
    const normalizedChannel = normalizeChannel(row.channel);
    if (!channelMap.has(normalizedChannel)) {
      channelMap.set(normalizedChannel, { steps: {}, revenue: 0, purchaseCount: 0 });
    }
    const entry = channelMap.get(normalizedChannel)!;
    entry.revenue += Number(row.grossRev);
    entry.purchaseCount += Number(row.purchaseCount);
  }

  for (const [source, sessions] of pvBySource) {
    const normalizedSource = normalizeChannel(source);
    if (!channelMap.has(normalizedSource)) {
      channelMap.set(normalizedSource, { steps: {}, revenue: 0, purchaseCount: 0 });
    }
    channelMap.get(normalizedSource)!.steps["pageview"] = sessions;
  }

  const marketingBySource = new Map<string, number>();
  for (const row of marketingRows) {
    marketingBySource.set(row.source, Number(row.totalAmountInCents));
  }

  const allChannels: IChannelData[] = Array.from(channelMap.entries()).map(
    ([channel, data]) => {
      const firstStepKey = funnelSteps[0]?.eventType;
      const lastStepKey = funnelSteps[funnelSteps.length - 1]?.eventType;
      const firstCount = firstStepKey ? (data.steps[firstStepKey] ?? 0) : 0;
      const lastCount = lastStepKey ? (data.steps[lastStepKey] ?? 0) : data.purchaseCount;
      const conversionRate =
        firstCount > 0 ? ((lastCount / firstCount) * 100).toFixed(1) + "%" : "0%";
      const ticketMedio = data.purchaseCount > 0 ? data.revenue / data.purchaseCount : 0;

      const marketingSource = getSourceForChannelKey(channel);
      let investment: number | undefined;
      let roi: number | null | undefined;

      if (marketingSource && !isGroupedSource(marketingSource)) {
        const investmentAmt = marketingBySource.get(marketingSource);
        if (investmentAmt !== undefined) {
          investment = investmentAmt;
          roi = investmentAmt > 0 ? Math.round(((data.revenue - investmentAmt) / investmentAmt) * 100) : null;
        }
      }

      return {
        channel,
        steps: data.steps,
        revenue: data.revenue,
        ticket_medio: ticketMedio,
        conversion_rate: conversionRate,
        previousRevenue: previousRevenueMap.get(channel),
        ...(investment !== undefined && { investment }),
        ...(roi !== undefined && { roi }),
      };
    }
  );

  const searchTerm = params.search?.toLowerCase().trim();
  const filtered = searchTerm
    ? allChannels.filter((c) => {
        const namePt = getChannelName(c.channel, "pt").toLowerCase();
        const nameEn = getChannelName(c.channel, "en").toLowerCase();
        return (
          c.channel.toLowerCase().includes(searchTerm) ||
          namePt.includes(searchTerm) ||
          nameEn.includes(searchTerm)
        );
      })
    : allChannels;

  const sorted = [...filtered].sort((a, b) => {
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

  const allSorted = [...allChannels].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = allSorted.reduce((sum, c) => sum + c.revenue, 0);
  const channelsWithRevenue = allSorted.filter((c) => c.revenue > 0).length;
  const topChannel = allSorted[0]?.channel ?? "";
  const top2Revenue = allSorted.slice(0, 2).reduce((sum, c) => sum + c.revenue, 0);
  const concentrationTop2 = totalRevenue > 0 ? Math.round((top2Revenue / totalRevenue) * 100) : 0;

  const investmentGroups: IChannelInvestmentGroup[] = Object.entries(SOURCE_GROUPS)
    .map(([source, cfg]) => {
      const investmentAmt = marketingBySource.get(source) ?? 0;
      if (investmentAmt === 0) return null;
      const channelKeys = cfg.sources.map((s) => `${s}_paid`);
      const revenueInCents = channelKeys.reduce((sum, ck) => {
        const ch = allChannels.find((c) => c.channel === ck);
        return sum + (ch?.revenue ?? 0);
      }, 0);
      const roi = investmentAmt > 0 ? Math.round(((revenueInCents - investmentAmt) / investmentAmt) * 100) : null;
      return {
        source,
        label: getMarketingSourceLabel(source, locale),
        investmentInCents: investmentAmt,
        revenueInCents,
        roi,
        channelKeys,
      } satisfies IChannelInvestmentGroup;
    })
    .filter((g): g is IChannelInvestmentGroup => g !== null);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    stepMeta,
    totalRevenue,
    channelsWithRevenue,
    topChannel,
    concentrationTop2,
    investmentGroups,
  };
}
