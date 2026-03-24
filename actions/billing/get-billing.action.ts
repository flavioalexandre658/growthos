"use server";

import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { eq, and, sql, inArray, gte } from "drizzle-orm";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { users, organizations, orgMembers, payments } from "@/db/schema";
import { getPlan } from "@/utils/plans";
import { REVENUE_EVENT_TYPES } from "@/utils/event-types";
import dayjs from "@/utils/dayjs";
import type { IPlanTier } from "@/utils/plans";

export interface IOrgRevenueUsage {
  organizationId: string;
  organizationName: string;
  revenueInCents: number;
}

export interface IBillingData {
  plan: IPlanTier;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
  revenue: {
    totalInCents: number;
    limitInCents: number;
    percentage: number;
    byOrg: IOrgRevenueUsage[];
    yearMonth: string;
  };
  ownedOrgsCount: number;
  totalMembersInOrg: number;
}

export async function getBilling(): Promise<IBillingData | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const yearMonth = dayjs().format("YYYY-MM");
  const monthStart = dayjs().startOf("month").toDate();

  const [userRow] = await db
    .select({
      planSlug: users.planSlug,
      subscriptionStatus: users.subscriptionStatus,
      currentPeriodEnd: users.currentPeriodEnd,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!userRow) return null;

  const plan = getPlan(userRow.planSlug);
  const appLocale = await getLocale();

  const memberOrgs = await db
    .select({ organizationId: orgMembers.organizationId, role: orgMembers.role })
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id));

  const ownedOrgIds = memberOrgs.filter((m) => m.role === "owner").map((m) => m.organizationId);
  const ownedOrgsCount = ownedOrgIds.length;

  const allOrgIds = memberOrgs.map((m) => m.organizationId);

  let revenueByOrg: { organizationId: string; revenue: number }[] = [];
  if (allOrgIds.length > 0) {
    revenueByOrg = await db
      .select({
        organizationId: payments.organizationId,
        revenue: sql<number>`COALESCE(SUM(COALESCE(${payments.baseGrossValueInCents}, ${payments.grossValueInCents})), 0)`,
      })
      .from(payments)
      .where(
        and(
          inArray(payments.organizationId, allOrgIds),
          inArray(payments.eventType, [...REVENUE_EVENT_TYPES]),
          gte(payments.createdAt, monthStart),
        ),
      )
      .groupBy(payments.organizationId);
  }

  const orgNames: Record<string, string> = {};
  if (allOrgIds.length > 0) {
    const orgRows = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(inArray(organizations.id, allOrgIds));
    for (const o of orgRows) orgNames[o.id] = o.name;
  }

  const totalRevenueInCents = revenueByOrg.reduce((sum, r) => sum + Number(r.revenue), 0);
  const limitInCents = appLocale === "pt"
    ? plan.maxRevenuePerMonthBrl
    : plan.maxRevenuePerMonthUsd;
  const percentage = limitInCents === Infinity
    ? 0
    : Math.min(100, Math.round((totalRevenueInCents / limitInCents) * 100));

  const [memberCountRow] = ownedOrgIds.length > 0
    ? await db
        .select({ count: sql<number>`COUNT(DISTINCT ${orgMembers.userId})` })
        .from(orgMembers)
        .where(inArray(orgMembers.organizationId, ownedOrgIds))
    : [{ count: 1 }];

  return {
    plan,
    subscriptionStatus: userRow.subscriptionStatus,
    currentPeriodEnd: userRow.currentPeriodEnd,
    revenue: {
      totalInCents: Math.max(0, totalRevenueInCents),
      limitInCents,
      percentage,
      byOrg: revenueByOrg.map((r) => ({
        organizationId: r.organizationId,
        organizationName: orgNames[r.organizationId] ?? r.organizationId,
        revenueInCents: Number(r.revenue),
      })),
      yearMonth,
    },
    ownedOrgsCount,
    totalMembersInOrg: Number(memberCountRow?.count ?? 1),
  };
}
