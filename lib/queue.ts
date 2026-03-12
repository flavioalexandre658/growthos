import { Queue } from "bullmq";

function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
  };
}

function getConnectionOptions() {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const opts = parseRedisUrl(url);
  return {
    ...opts,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      return Math.min(times * 200, 5000);
    },
  };
}

export { getConnectionOptions };

let _syncQueue: Queue | null = null;

export function getSyncQueue(): Queue {
  if (!_syncQueue) {
    _syncQueue = new Queue("sync", {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      },
    });
  }
  return _syncQueue;
}

export interface SyncJobData {
  organizationId: string;
  integrationId: string;
  provider: "stripe" | "asaas";
}

export interface SyncJobProgress {
  phase: "deleting" | "fetching" | "processing" | "finalizing" | "completed" | "error";
  current: number;
  total: number;
  message: string;
}
