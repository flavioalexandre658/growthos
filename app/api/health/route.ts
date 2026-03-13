import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { getSyncQueue, getAiQueue, getWebhookQueue, getEmailQueue } from "@/lib/queue";
import { Queue } from "bullmq";
import { getConnectionOptions } from "@/lib/queue";

export const dynamic = "force-dynamic";

async function getQueueStats(queue: Queue) {
  const [waiting, active, delayed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount(),
    queue.getFailedCount(),
  ]);
  return { waiting, active, delayed, failed };
}

export async function GET() {
  const checks: Record<string, unknown> = {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  try {
    const redis = getRedis();
    const pong = await redis.ping();
    const info = await redis.info("memory");
    const usedMatch = info.match(/used_memory_human:(\S+)/);
    checks.redis = {
      status: pong === "PONG" ? "ok" : "error",
      memory: usedMatch?.[1] ?? "unknown",
    };
  } catch (err) {
    checks.redis = {
      status: "error",
      message: err instanceof Error ? err.message : "unknown",
    };
  }

  try {
    const cronQueue = new Queue("cron", { connection: getConnectionOptions() });
    const [sync, ai, webhooks, email, cron] = await Promise.all([
      getQueueStats(getSyncQueue()),
      getQueueStats(getAiQueue()),
      getQueueStats(getWebhookQueue()),
      getQueueStats(getEmailQueue()),
      getQueueStats(cronQueue),
    ]);
    checks.queues = { sync, ai, webhooks, email, cron };
  } catch (err) {
    checks.queues = {
      status: "error",
      message: err instanceof Error ? err.message : "unknown",
    };
  }

  const isHealthy =
    (checks.redis as Record<string, unknown>)?.status === "ok";

  return NextResponse.json(checks, { status: isHealthy ? 200 : 503 });
}
