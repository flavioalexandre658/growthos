import { getRedis } from "./redis";

const DEFAULT_TTL = 45;

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getRedis().get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds = DEFAULT_TTL
): Promise<void> {
  try {
    await getRedis().set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // cache write failure is non-critical
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch {
    // cache delete failure is non-critical
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const redis = getRedis();
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        200
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // pattern delete failure is non-critical
  }
}

export function dashboardCacheKey(
  orgId: string,
  action: string,
  paramsHash: string
): string {
  return `cache:dash:${orgId}:${action}:${paramsHash}`;
}

export function apiKeyCacheKey(key: string): string {
  return `cache:apikey:${key}`;
}

export function orgConfigCacheKey(orgId: string): string {
  return `cache:org:${orgId}`;
}

export function aiResultCacheKey(
  orgId: string,
  type: string,
  hash: string
): string {
  return `cache:ai:${orgId}:${type}:${hash}`;
}

export async function invalidateOrgDashboardCache(
  orgId: string
): Promise<void> {
  await cacheDelPattern(`cache:dash:${orgId}:*`);
}

export async function invalidateApiKeyCache(key: string): Promise<void> {
  await cacheDel(apiKeyCacheKey(key));
}

export async function invalidateOrgConfigCache(orgId: string): Promise<void> {
  await cacheDel(orgConfigCacheKey(orgId));
}
