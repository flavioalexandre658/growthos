import type { Job } from "bullmq";

export interface CronJobData {
  cronName: string;
}

export async function processCronJob(job: Job<CronJobData>) {
  const { cronName } = job.data;
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("CRON_SECRET not configured");
  }

  if (cronName === "flush-failed-events") {
    const { flushFailedEventBuffer } = await import("@/utils/event-fail-buffer");
    return await flushFailedEventBuffer();
  }

  const pathMap: Record<string, string> = {
    "email-sequences": "/api/cron/email-sequences",
    "weekly-digest": "/api/cron/weekly-digest",
    "aggregate-and-cleanup": "/api/cron/aggregate-and-cleanup",
    "evaluate-alerts": "/api/cron/evaluate-alerts",
  };

  const path = pathMap[cronName];
  if (!path) {
    throw new Error(`Unknown cron job: ${cronName}`);
  }

  console.log(`[cron-worker] Running ${cronName}...`);

  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cron ${cronName} failed (${res.status}): ${text}`);
  }

  const result = await res.json().catch(() => ({}));
  console.log(`[cron-worker] ${cronName} completed:`, result);

  return result;
}
