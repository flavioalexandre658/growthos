import { Worker } from "bullmq";
import { getConnectionOptions } from "@/lib/queue";
import type { SyncJobData } from "@/lib/queue";
import { processStripeSyncJob } from "./sync-stripe.worker";
import { processAsaasSyncJob } from "./sync-asaas.worker";
import { db } from "@/db";
import { integrations, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createNotification } from "@/utils/create-notification";
import { sanitizeSyncError } from "@/utils/sanitize-sync-error";

async function resolveOrgSlug(organizationId: string): Promise<string | null> {
  const [org] = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return org?.slug ?? null;
}

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

        const safeMsg = sanitizeSyncError(err);

        await db
          .update(integrations)
          .set({
            status: "error",
            syncError: safeMsg,
            syncJobId: null,
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, job.data.integrationId))
          .catch(() => {});

        const failSlug = await resolveOrgSlug(job.data.organizationId).catch(() => null);
        await createNotification({
          organizationId: job.data.organizationId,
          type: "sync",
          title: `Falha na sincronização ${job.data.provider === "stripe" ? "Stripe" : "Asaas"}`,
          body: safeMsg,
          linkUrl: failSlug ? `/${failSlug}/settings/integrations` : undefined,
        }).catch(() => {});

        throw err;
      }
    },
    {
      connection,
      concurrency: 2,
      stalledInterval: 120_000,
      maxStalledCount: 3,
    },
  );

  syncWorker.on("completed", async (job) => {
    console.log(`[sync-worker] Job ${job.id} completed for ${job.data.provider}`);

    const result = job.returnvalue as {
      subscriptionsSynced?: number;
      invoicesSynced?: number;
      paymentsSynced?: number;
      oneTimePurchasesSynced?: number;
    };

    const providerLabel = job.data.provider === "stripe" ? "Stripe" : "Asaas";
    const payments = (result?.invoicesSynced ?? result?.paymentsSynced ?? 0) + (result?.oneTimePurchasesSynced ?? 0);
    const subs = result?.subscriptionsSynced ?? 0;

    const okSlug = await resolveOrgSlug(job.data.organizationId).catch(() => null);
    await createNotification({
      organizationId: job.data.organizationId,
      type: "sync",
      title: `Sincronização ${providerLabel} concluída`,
      body: `${subs} assinatura${subs !== 1 ? "s" : ""} e ${payments} pagamento${payments !== 1 ? "s" : ""} sincronizados.`,
      linkUrl: okSlug ? `/${okSlug}/settings/integrations` : undefined,
    }).catch(() => {});
  });

  syncWorker.on("failed", (job, err) => {
    console.error(`[sync-worker] Job ${job?.id} failed:`, err.message);
  });

  syncWorker.on("error", (err) => {
    console.error("[sync-worker] Worker error:", err);
  });

  console.log("[sync-worker] Workers started and listening for jobs");
}
