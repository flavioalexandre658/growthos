import { Worker } from "bullmq";
import { getConnectionOptions } from "@/lib/queue";
import type { SyncJobData } from "@/lib/queue";
import { processStripeSyncJob } from "./sync-stripe.worker";
import { processAsaasSyncJob } from "./sync-asaas.worker";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";

export function startWorkers(): void {
  const connection = getConnectionOptions();

  const syncWorker = new Worker<SyncJobData>(
    "sync",
    async (job) => {
      console.log(`[sync-worker] Starting ${job.data.provider} sync for org ${job.data.organizationId}`);

      try {
        if (job.data.provider === "stripe") {
          return await processStripeSyncJob(job);
        }
        if (job.data.provider === "asaas") {
          return await processAsaasSyncJob(job);
        }
        throw new Error(`Unknown provider: ${job.data.provider}`);
      } catch (err) {
        console.error(`[sync-worker] Job ${job.id} failed:`, err);

        await db
          .update(integrations)
          .set({
            status: "error",
            syncError: err instanceof Error ? err.message : String(err),
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, job.data.integrationId))
          .catch(() => {});

        throw err;
      }
    },
    {
      connection,
      concurrency: 2,
    },
  );

  syncWorker.on("completed", (job) => {
    console.log(`[sync-worker] Job ${job.id} completed for ${job.data.provider}`);
  });

  syncWorker.on("failed", (job, err) => {
    console.error(`[sync-worker] Job ${job?.id} failed:`, err.message);
  });

  syncWorker.on("error", (err) => {
    console.error("[sync-worker] Worker error:", err);
  });

  console.log("[sync-worker] Workers started and listening for jobs");
}
