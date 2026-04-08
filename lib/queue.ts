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

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: { age: 86400 },
  removeOnFail: { age: 604800 },
};

let _syncQueue: Queue | null = null;
let _aiQueue: Queue | null = null;
let _webhookQueue: Queue | null = null;
let _emailQueue: Queue | null = null;

export function getSyncQueue(): Queue {
  if (!_syncQueue) {
    _syncQueue = new Queue("sync", {
      connection: getConnectionOptions(),
      defaultJobOptions,
    });
  }
  return _syncQueue;
}

export function getAiQueue(): Queue {
  if (!_aiQueue) {
    _aiQueue = new Queue("ai", {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 3,
        backoff: { type: "exponential", delay: 10000 },
      },
    });
  }
  return _aiQueue;
}

export function getWebhookQueue(): Queue {
  if (!_webhookQueue) {
    _webhookQueue = new Queue("webhooks", {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 5,
        backoff: { type: "exponential", delay: 3000 },
      },
    });
  }
  return _webhookQueue;
}

export function getEmailQueue(): Queue {
  if (!_emailQueue) {
    _emailQueue = new Queue("email", {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    });
  }
  return _emailQueue;
}

export interface SyncJobData {
  organizationId: string;
  integrationId: string;
  provider: "stripe" | "asaas" | "kiwify" | "hotmart";
}

export interface SyncJobProgress {
  phase: "deleting" | "fetching" | "processing" | "finalizing" | "completed" | "error";
  current: number;
  total: number;
  message: string;
  reachedLimit?: boolean;
}

export interface AiJobData {
  type: "analysis" | "comparison";
  orgName: string;
  providerType?: string;
  language: string;
  currency: string;
  country?: string;
  data: Record<string, unknown>;
  cacheKey: string;
}

export interface WebhookJobData {
  provider: "stripe" | "asaas" | "kiwify" | "hotmart";
  integrationId: string;
  organizationId: string;
  payload: string;
  signature?: string;
}

export interface EmailJobData {
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
}
