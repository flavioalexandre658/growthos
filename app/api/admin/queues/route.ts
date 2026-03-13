import { NextRequest, NextResponse } from "next/server";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { getSyncQueue, getAiQueue, getWebhookQueue, getEmailQueue } from "@/lib/queue";
import { Queue } from "bullmq";
import { getConnectionOptions } from "@/lib/queue";

export const dynamic = "force-dynamic";

let _html: string | null = null;

function getBullBoardHtml(): string {
  if (_html) return _html;

  const cronQueue = new Queue("cron", { connection: getConnectionOptions() });

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/api/admin/queues");

  createBullBoard({
    queues: [
      new BullMQAdapter(getSyncQueue()),
      new BullMQAdapter(getAiQueue()),
      new BullMQAdapter(getWebhookQueue()),
      new BullMQAdapter(getEmailQueue()),
      new BullMQAdapter(cronQueue),
    ],
    serverAdapter,
  });

  _html = `<!DOCTYPE html>
<html>
<head><title>Groware Queues</title></head>
<body>
  <h1>Queue Dashboard</h1>
  <p>BullBoard UI is available at <code>/api/admin/queues</code></p>
  <p>Use the <a href="/api/health">/api/health</a> endpoint for queue metrics.</p>
</body>
</html>`;
  return _html;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const syncQueue = getSyncQueue();
  const aiQueue = getAiQueue();
  const webhookQueue = getWebhookQueue();
  const emailQueue = getEmailQueue();
  const cronQueue = new Queue("cron", { connection: getConnectionOptions() });

  const getQueueStats = async (queue: Queue) => {
    const [waiting, active, delayed, failed, completed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getFailedCount(),
      queue.getCompletedCount(),
    ]);
    return { waiting, active, delayed, failed, completed };
  };

  const [sync, ai, webhooks, email, cron] = await Promise.all([
    getQueueStats(syncQueue),
    getQueueStats(aiQueue),
    getQueueStats(webhookQueue),
    getQueueStats(emailQueue),
    getQueueStats(cronQueue),
  ]);

  return NextResponse.json({
    queues: { sync, ai, webhooks, email, cron },
    timestamp: new Date().toISOString(),
  });
}
