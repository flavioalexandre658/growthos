"use server";

import { db } from "@/db";
import {
  events,
  integrations,
  orgMembers,
  organizations,
  pageviewAggregates,
  pageviewDailySessions,
  funnelDaily,
} from "@/db/schema";
import { eq, and, gte, lte, sum, count, desc, sql } from "drizzle-orm";
import dayjs from "dayjs";

export interface IEmailDynamicData {
  userName: string;
  userEmail: string;
  orgName: string;
  orgSlug?: string;
  locale: "pt" | "en";
  onboardingStep?: string;
  revenueFormatted?: string;
  totalPageviews?: number;
  totalSignups?: number;
  accessCount?: number;
  significantChange?: string;
  periodRevenue?: string;
  newSubscribers?: number;
  churnRate?: string;
  mrr?: string;
  mrrDelta?: string;
  mrrDeltaPositive?: boolean;
  weekRevenue?: string;
  topChannel?: string;
  aiInsight?: string;
}

export async function getEmailDynamicData(
  emailId: string,
  userId: string,
  organizationId: string,
): Promise<IEmailDynamicData | null> {
  const [user] = await db
    .select({
      name: sql<string>`users.name`,
      email: sql<string>`users.email`,
      locale: sql<string>`users.locale`,
    })
    .from(sql`users`)
    .where(sql`users.id = ${userId}`)
    .limit(1);

  if (!user) return null;

  const [org] = await db
    .select({ name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const locale = (user.locale === "en" ? "en" : "pt") as "pt" | "en";
  const currencyLocale = locale === "pt" ? "pt-BR" : "en-US";
  const currency = locale === "pt" ? "BRL" : "USD";

  const base: IEmailDynamicData = {
    userName: user.name,
    userEmail: user.email,
    orgName: org?.name ?? "",
    orgSlug: org?.slug,
    locale,
  };

  if (emailId.startsWith("onboarding_incomplete")) {
    const [member] = await db
      .select({ tourState: orgMembers.tourState })
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.userId, userId),
          eq(orgMembers.organizationId, organizationId),
        ),
      )
      .limit(1);

    const tour = member?.tourState;
    const step = tour?.tourCompletedAt ? "5" : tour?.tourStartedAt ? "2" : "1";
    return { ...base, onboardingStep: step };
  }

  if (emailId.startsWith("gateway_only")) {
    const thirtyDaysAgo = dayjs().subtract(30, "day").toDate();
    const [revResult] = await db
      .select({ total: sum(events.baseGrossValueInCents) })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          gte(events.createdAt, thirtyDaysAgo),
        ),
      );

    const totalCents = Number(revResult?.total ?? 0);
    const revenueFormatted = new Intl.NumberFormat(currencyLocale, {
      style: "currency",
      currency,
    }).format(totalCents / 100);

    return { ...base, revenueFormatted };
  }

  if (emailId.startsWith("tracker_only")) {
    const [pvCount] = await db
      .select({ total: count() })
      .from(pageviewAggregates)
      .where(eq(pageviewAggregates.organizationId, organizationId));

    const [signupCount] = await db
      .select({ total: count() })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.eventType, "signup"),
        ),
      );

    return {
      ...base,
      totalPageviews: Number(pvCount?.total ?? 0),
      totalSignups: Number(signupCount?.total ?? 0),
    };
  }

  if (emailId.startsWith("free_active")) {
    const thirtyDaysAgo = dayjs().subtract(30, "day").toDate();
    const [member] = await db
      .select({ emailSequenceState: orgMembers.emailSequenceState })
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.userId, userId),
          eq(orgMembers.organizationId, organizationId),
        ),
      )
      .limit(1);

    const emailsSent = member?.emailSequenceState?.emailsSent ?? {};
    const accessCount = Object.keys(emailsSent).length;

    return { ...base, accessCount };
  }

  if (emailId.startsWith("inactive")) {
    const now = dayjs();
    const threeWeeksAgo = now.subtract(21, "day").toDate();
    const sixWeeksAgo = now.subtract(42, "day").toDate();

    const [currentRevResult] = await db
      .select({ total: sum(events.baseGrossValueInCents) })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          gte(events.createdAt, threeWeeksAgo),
          lte(events.createdAt, now.toDate()),
        ),
      );

    const [prevRevResult] = await db
      .select({ total: sum(events.baseGrossValueInCents) })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          gte(events.createdAt, sixWeeksAgo),
          lte(events.createdAt, threeWeeksAgo),
        ),
      );

    const currentRev = Number(currentRevResult?.total ?? 0);
    const prevRev = Number(prevRevResult?.total ?? 0);
    const delta = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0;

    const periodRevenue = new Intl.NumberFormat(currencyLocale, {
      style: "currency",
      currency,
    }).format(currentRev / 100);

    let significantChange: string | undefined;
    if (Math.abs(delta) >= 5) {
      const direction = delta > 0 ? (locale === "pt" ? "cresceu" : "grew") : (locale === "pt" ? "caiu" : "dropped");
      const pct = Math.abs(delta).toFixed(0);
      significantChange =
        locale === "pt"
          ? `Seu MRR ${direction} ${pct}% nas últimas duas semanas`
          : `Your MRR ${direction} ${pct}% in the last two weeks`;
    }

    const [subCount] = await db
      .select({ total: count() })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.eventType, "subscription_created"),
          gte(events.createdAt, threeWeeksAgo),
        ),
      );

    return {
      ...base,
      periodRevenue,
      newSubscribers: Number(subCount?.total ?? 0),
      churnRate: "—",
      significantChange,
    };
  }

  if (emailId === "digest_weekly") {
    return buildDigestData(base, organizationId, currencyLocale, currency);
  }

  return base;
}

async function buildDigestData(
  base: IEmailDynamicData,
  organizationId: string,
  currencyLocale: string,
  currency: string,
): Promise<IEmailDynamicData> {
  const now = dayjs();
  const sevenDaysAgo = now.subtract(7, "day").toDate();
  const fourteenDaysAgo = now.subtract(14, "day").toDate();

  const [weekRevResult] = await db
    .select({ total: sum(events.baseGrossValueInCents) })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        gte(events.createdAt, sevenDaysAgo),
      ),
    );

  const [prevWeekRevResult] = await db
    .select({ total: sum(events.baseGrossValueInCents) })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        gte(events.createdAt, fourteenDaysAgo),
        lte(events.createdAt, sevenDaysAgo),
      ),
    );

  const weekRevCents = Number(weekRevResult?.total ?? 0);
  const prevWeekRevCents = Number(prevWeekRevResult?.total ?? 0);
  const mrrDeltaPct =
    prevWeekRevCents > 0
      ? (((weekRevCents - prevWeekRevCents) / prevWeekRevCents) * 100).toFixed(1)
      : "0";

  const weekRevenue = new Intl.NumberFormat(currencyLocale, {
    style: "currency",
    currency,
  }).format(weekRevCents / 100);

  const mrr = new Intl.NumberFormat(currencyLocale, {
    style: "currency",
    currency,
  }).format(weekRevCents / 100);

  const [newSubsResult] = await db
    .select({ total: count() })
    .from(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.eventType, "subscription_created"),
        gte(events.createdAt, sevenDaysAgo),
      ),
    );

  const [topChannelResult] = await db
    .select({
      source: pageviewDailySessions.source,
      totalSessions: sum(pageviewDailySessions.sessions),
    })
    .from(pageviewDailySessions)
    .where(
      and(
        eq(pageviewDailySessions.organizationId, organizationId),
        gte(pageviewDailySessions.date, dayjs(sevenDaysAgo).format("YYYY-MM-DD")),
      ),
    )
    .groupBy(pageviewDailySessions.source)
    .orderBy(desc(sum(pageviewDailySessions.sessions)))
    .limit(1);

  return {
    ...base,
    mrr,
    mrrDelta: `${mrrDeltaPct}%`,
    mrrDeltaPositive: Number(mrrDeltaPct) >= 0,
    weekRevenue,
    newSubscribers: Number(newSubsResult?.total ?? 0),
    churnRate: "—",
    topChannel: topChannelResult?.source || undefined,
  };
}
