import { getRedis } from "@/lib/redis";

const WINDOW_MS = 60;
const MAX_REQUESTS = 1000;

const memoryWindows = new Map<string, { count: number; resetAt: number }>();

function checkMemoryFallback(key: string): boolean {
  const now = Date.now();
  const entry = memoryWindows.get(key);
  if (!entry || now > entry.resetAt) {
    memoryWindows.set(key, { count: 1, resetAt: now + WINDOW_MS * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_REQUESTS;
}

export async function checkRateLimit(key: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, WINDOW_MS);
    }
    return count <= MAX_REQUESTS;
  } catch {
    return checkMemoryFallback(key);
  }
}
