import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPlan } from "@/utils/plans";
import { getOrgOwnerId, getPlanUsage } from "@/utils/get-plan-usage";

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

export async function isOrgOverRevenueLimit(organizationId: string): Promise<boolean> {
  const cached = getCached(organizationId);
  if (cached !== null) return cached;

  const ownerId = await getOrgOwnerId(organizationId);
  if (!ownerId) {
    setCached(organizationId, false);
    return false;
  }

  const [userRow] = await db
    .select({ planSlug: users.planSlug })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);

  if (!userRow) {
    setCached(organizationId, false);
    return false;
  }

  const plan = getPlan(userRow.planSlug);

  if (plan.maxRevenuePerMonthBrl === Infinity) {
    setCached(organizationId, false);
    return false;
  }

  const usage = await getPlanUsage(ownerId);
  const isOver = usage.totalRevenueInCents >= plan.maxRevenuePerMonthBrl;

  setCached(organizationId, isOver);
  return isOver;
}
