import Redis, { type RedisOptions } from "ioredis";

function buildRedisOptions(): RedisOptions {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      return Math.min(times * 200, 5000);
    },
    lazyConnect: true,
  };
}

let _client: Redis | null = null;

export function getRedis(): Redis {
  if (!_client) {
    _client = new Redis(buildRedisOptions());
    _client.on("error", (err) => {
      console.error("[redis] Connection error:", err.message);
    });
    _client.connect().catch(() => {});
  }
  return _client;
}

export async function closeRedis(): Promise<void> {
  if (_client) {
    await _client.quit().catch(() => {});
    _client = null;
  }
}
