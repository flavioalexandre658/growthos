import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { SyncJobData, SyncJobProgress } from "@/lib/queue";

function report(job: Job, progress: SyncJobProgress): void {
  job.updateProgress(progress).catch(() => {});
}

export async function processKirvanoSyncJob(job: Job<SyncJobData>): Promise<{
  subscriptionsSynced: number;
  paymentsSynced: number;
  oneTimePurchasesSynced: number;
}> {
  const { organizationId, integrationId } = job.data;

  report(job, {
    phase: "fetching",
    current: 0,
    total: 0,
    message: "Kirvano é webhook-only, nenhuma transação para buscar...",
  });

  report(job, {
    phase: "completed",
    current: 0,
    total: 0,
    message: "Sync concluído!",
  });

  await db
    .update(integrations)
    .set({
      status: "active",
      historySyncedAt: new Date(),
      lastSyncedAt: new Date(),
      syncError: null,
      syncJobId: null,
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));

  return { subscriptionsSynced: 0, paymentsSynced: 0, oneTimePurchasesSynced: 0 };
}
