import { NextRequest, NextResponse } from "next/server";
import { getSyncQueue, getAiQueue, getWebhookQueue, getEmailQueue } from "@/lib/queue";
import { Queue } from "bullmq";
import { getConnectionOptions } from "@/lib/queue";

export const dynamic = "force-dynamic";

async function getQueueStats(queue: Queue) {
  const [waiting, active, delayed, failed, completed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount(),
    queue.getFailedCount(),
    queue.getCompletedCount(),
  ]);
  return { waiting, active, delayed, failed, completed };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const cronQueue = new Queue("cron", { connection: getConnectionOptions() });

  const [sync, ai, webhooks, email, cron] = await Promise.all([
    getQueueStats(getSyncQueue()),
    getQueueStats(getAiQueue()),
    getQueueStats(getWebhookQueue()),
    getQueueStats(getEmailQueue()),
    getQueueStats(cronQueue),
  ]);

  return NextResponse.json({
    queues: { sync, ai, webhooks, email, cron },
    timestamp: new Date().toISOString(),
  });
}
