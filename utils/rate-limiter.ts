import { getRedis } from "@/lib/redis";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 1000;

const memoryWindows = new Map<string, { count: number; resetAt: number }>();

function checkMemoryFallback(key: string): boolean {
  const now = Date.now();
  const entry = memoryWindows.get(key);
  if (!entry || now > entry.resetAt) {
    memoryWindows.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_REQUESTS;
}

const LUA_INCR_WITH_TTL = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
elseif redis.call('TTL', KEYS[1]) == -1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

export async function checkRateLimit(key: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const redisKey = `ratelimit:${key}`;
    const count = await redis.eval(LUA_INCR_WITH_TTL, 1, redisKey, WINDOW_SECONDS) as number;
    return count <= MAX_REQUESTS;
  } catch {
    return checkMemoryFallback(key);
  }
}
