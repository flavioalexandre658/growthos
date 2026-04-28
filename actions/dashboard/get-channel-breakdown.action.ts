"use server";

import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { eq, and, gte, lte, inArray, isNotNull, sql } from "drizzle-orm";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import { db } from "@/db";
import { payments, events, organizations } from "@/db/schema";
import { resolveDateRange } from "@/utils/resolve-date-range";
import { getUserPlan } from "@/utils/get-user-plan";
import type {
  IDateFilter,
  IChannelBreakdownResult,
  IChannelBreakdownItem,
} from "@/interfaces/dashboard.interface";

const channelBreakdownSchema = z.object({
  organizationId: z.string().uuid(),
  channelKey: z.string().min(1).max(120),
  filter: z
    .object({
      period: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
    })
    .optional(),
});

export type ChannelBreakdownInput = z.infer<typeof channelBreakdownSchema>;

const PAID_MEDIUMS = ["cpc", "ppc", "paid", "ads", "paid_social", "display", "cpv", "cpm"];

function parseChannelKey(channelKey: string): { source: string; isPaid: boolean | null } {
  if (channelKey === "direct") return { source: "direct", isPaid: null };
  if (channelKey.endsWith("_paid")) {
    return { source: channelKey.slice(0, -5), isPaid: true };
  }
  if (channelKey.endsWith("_organic")) {
    return { source: channelKey.slice(0, -8), isPaid: false };
  }
  return { source: channelKey, isPaid: null };
}

export async function getChannelBreakdown(
  input: ChannelBreakdownInput,
): Promise<IChannelBreakdownResult> {
  const EMPTY: IChannelBreakdownResult = { campaigns: [], contents: [], terms: [] };

  const parsed = channelBreakdownSchema.safeParse(input);
  if (!parsed.success) return EMPTY;

  const session = await getServerSession(authOptions);
  if (!session?.user) return EMPTY;

  const { organizationId, channelKey, filter } = parsed.data;
  const { source, isPaid } = parseChannelKey(channelKey);

  const [org] = await db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const tz = org?.timezone ?? "America/Sao_Paulo";
  const plan = await getUserPlan();
  const { startDate, endDate } = resolveDateRange(
    (filter ?? {}) as IDateFilter,
    tz,
    plan.maxHistoryDays,
  );

  const baseConditions = [
    eq(payments.organizationId, organizationId),
    gte(payments.createdAt, startDate),
    lte(payments.createdAt, endDate),
    inArray(payments.eventType, REVENUE_EVENT_TYPES),
  ];

  if (source === "direct") {
    baseConditions.push(
      sql`(LOWER(COALESCE(${payments.source}, 'direct')) = 'direct' AND LOWER(COALESCE(${payments.medium}, 'direct')) = 'direct')`,
    );
  } else {
    baseConditions.push(sql`LOWER(${payments.source}) = ${source.toLowerCase()}`);
    if (isPaid === true) {
      baseConditions.push(sql`LOWER(COALESCE(${payments.medium}, '')) IN ('cpc', 'ppc', 'paid', 'ads', 'paid_social', 'display', 'cpv', 'cpm')`);
    } else if (isPaid === false) {
      baseConditions.push(sql`LOWER(COALESCE(${payments.medium}, '')) NOT IN ('cpc', 'ppc', 'paid', 'ads', 'paid_social', 'display', 'cpv', 'cpm')`);
    }
  }

  const TOP_LIMIT = 5;

  const eventConditions = [
    eq(events.organizationId, organizationId),
    gte(events.createdAt, startDate),
    lte(events.createdAt, endDate),
  ];

  if (source === "direct") {
    eventConditions.push(
      sql`(LOWER(COALESCE(${events.source}, 'direct')) = 'direct' AND LOWER(COALESCE(${events.medium}, 'direct')) = 'direct')`,
    );
  } else {
    eventConditions.push(sql`LOWER(${events.source}) = ${source.toLowerCase()}`);
    if (isPaid === true) {
      eventConditions.push(sql`LOWER(COALESCE(${events.medium}, '')) IN ('cpc', 'ppc', 'paid', 'ads', 'paid_social', 'display', 'cpv', 'cpm')`);
    } else if (isPaid === false) {
      eventConditions.push(sql`LOWER(COALESCE(${events.medium}, '')) NOT IN ('cpc', 'ppc', 'paid', 'ads', 'paid_social', 'display', 'cpv', 'cpm')`);
    }
  }

  const [campaignRows, contentRows, termRows] = await Promise.all([
    db
      .select({
        name: payments.campaign,
        count: sql<number>`COUNT(*)`,
        revenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
      })
      .from(payments)
      .where(and(...baseConditions, isNotNull(payments.campaign), sql`${payments.campaign} <> ''`))
      .groupBy(payments.campaign)
      .orderBy(sql`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0) DESC`)
      .limit(TOP_LIMIT),

    db
      .select({
        name: payments.content,
        count: sql<number>`COUNT(*)`,
        revenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
      })
      .from(payments)
      .where(and(...baseConditions, isNotNull(payments.content), sql`${payments.content} <> ''`))
      .groupBy(payments.content)
      .orderBy(sql`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0) DESC`)
      .limit(TOP_LIMIT),

    db
      .select({
        name: events.term,
        count: sql<number>`COUNT(*)`,
        revenue: sql<number>`COALESCE(SUM(COALESCE(${events.baseGrossValueInCents}, ${events.grossValueInCents})), 0)`,
      })
      .from(events)
      .where(and(...eventConditions, isNotNull(events.term), sql`${events.term} <> ''`))
      .groupBy(events.term)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(TOP_LIMIT),
  ]);

  const mapItem = (rows: { name: string | null; count: number; revenue: number }[]): IChannelBreakdownItem[] =>
    rows
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name as string,
        count: Number(r.count),
        revenue: Number(r.revenue),
      }));

  return {
    campaigns: mapItem(campaignRows),
    contents: mapItem(contentRows),
    terms: mapItem(termRows),
  };
}
