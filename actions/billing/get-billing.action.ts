"use server";

import { getServerSession } from "next-auth";
import { eq, and, sql } from "drizzle-orm";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { users, usageMonthly, organizations, orgMembers } from "@/db/schema";
import { getPlan } from "@/utils/plans";
import dayjs from "@/utils/dayjs";
import type { IPlanTier } from "@/utils/plans";

export interface IOrgBillingUsage {
  organizationId: string;
  organizationName: string;
  eventsCount: number;
}

export interface IBillingData {
  plan: IPlanTier;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
  usage: {
    total: number;
    limit: number;
    percentage: number;
    byOrg: IOrgBillingUsage[];
    yearMonth: string;
  };
  ownedOrgsCount: number;
}

export async function getBilling(): Promise<IBillingData | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const yearMonth = dayjs().format("YYYY-MM");

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

  const usageRows = await db
    .select({
      organizationId: usageMonthly.organizationId,
      eventsCount: usageMonthly.eventsCount,
    })
    .from(usageMonthly)
    .where(
      and(
        eq(usageMonthly.userId, session.user.id),
        eq(usageMonthly.yearMonth, yearMonth),
      ),
    );

  const orgIds = usageRows.map((r) => r.organizationId);

  const orgNames: Record<string, string> = {};
  if (orgIds.length > 0) {
    const orgRows = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(sql`${organizations.id} = ANY(${orgIds})`);

    for (const o of orgRows) {
      orgNames[o.id] = o.name;
    }
  }

  const [ownedCountRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, session.user.id), eq(orgMembers.role, "owner")));

  const ownedOrgsCount = Number(ownedCountRow?.count ?? 0);
  const totalUsage = usageRows.reduce((sum, r) => sum + r.eventsCount, 0);

  return {
    plan,
    subscriptionStatus: userRow.subscriptionStatus,
    currentPeriodEnd: userRow.currentPeriodEnd,
    usage: {
      total: totalUsage,
      limit: plan.maxEventsPerMonth,
      percentage: Math.min(100, Math.round((totalUsage / plan.maxEventsPerMonth) * 100)),
      byOrg: usageRows.map((r) => ({
        organizationId: r.organizationId,
        organizationName: orgNames[r.organizationId] ?? r.organizationId,
        eventsCount: r.eventsCount,
      })),
      yearMonth,
    },
    ownedOrgsCount,
  };
}
