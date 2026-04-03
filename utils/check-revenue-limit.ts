"use server";

import { db } from "@/db";
import { users, organizations, orgMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getPlan } from "@/utils/plans";
import { getPlanUsage } from "@/utils/get-plan-usage";

interface CacheEntry {
  value: boolean;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

function getCached(orgId: string): boolean | null {
  const entry = cache.get(orgId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(orgId);
    return null;
  }
  return entry.value;
}

function setCached(orgId: string, value: boolean): void {
  cache.set(orgId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export interface RevenueBudget {
  limitInCents: number;
  usedInCents: number;
  remainingInCents: number;
  isUnlimited: boolean;
}

export async function getRevenueBudget(organizationId: string): Promise<RevenueBudget> {
  const [orgRow] = await db
    .select({
      userId: orgMembers.userId,
      currency: organizations.currency,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(organizations.id, orgMembers.organizationId))
    .where(
      and(
        eq(orgMembers.organizationId, organizationId),
        eq(orgMembers.role, "owner"),
      ),
    )
    .limit(1);

  if (!orgRow) return { limitInCents: Infinity, usedInCents: 0, remainingInCents: Infinity, isUnlimited: true };

  const [userRow] = await db
    .select({ planSlug: users.planSlug })
    .from(users)
    .where(eq(users.id, orgRow.userId))
    .limit(1);

  if (!userRow) return { limitInCents: Infinity, usedInCents: 0, remainingInCents: Infinity, isUnlimited: true };

  const plan = getPlan(userRow.planSlug);
  const isBrl = orgRow.currency === "BRL";
  const limitInCents = isBrl ? plan.maxRevenuePerMonthBrl : plan.maxRevenuePerMonthUsd;

  if (limitInCents === Infinity) {
    return { limitInCents: Infinity, usedInCents: 0, remainingInCents: Infinity, isUnlimited: true };
  }

  const usage = await getPlanUsage(orgRow.userId);
  const remaining = Math.max(0, limitInCents - usage.totalRevenueInCents);

  return {
    limitInCents,
    usedInCents: usage.totalRevenueInCents,
    remainingInCents: remaining,
    isUnlimited: false,
  };
}

export async function isOrgOverRevenueLimit(organizationId: string): Promise<boolean> {
  const cached = getCached(organizationId);
  if (cached !== null) return cached;

  // Get owner ID and org currency in one query
  const [orgRow] = await db
    .select({
      userId: orgMembers.userId,
      currency: organizations.currency,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(organizations.id, orgMembers.organizationId))
    .where(
      and(
        eq(orgMembers.organizationId, organizationId),
        eq(orgMembers.role, "owner"),
      ),
    )
    .limit(1);

  if (!orgRow) {
    setCached(organizationId, false);
    return false;
  }

  const [userRow] = await db
    .select({ planSlug: users.planSlug })
    .from(users)
    .where(eq(users.id, orgRow.userId))
    .limit(1);

  if (!userRow) {
    setCached(organizationId, false);
    return false;
  }

  const plan = getPlan(userRow.planSlug);
  const isBrl = orgRow.currency === "BRL";
  const limitInCents = isBrl ? plan.maxRevenuePerMonthBrl : plan.maxRevenuePerMonthUsd;

  if (limitInCents === Infinity) {
    setCached(organizationId, false);
    return false;
  }

  const usage = await getPlanUsage(orgRow.userId);
  const isOver = usage.totalRevenueInCents >= limitInCents;

  setCached(organizationId, isOver);
  return isOver;
}
