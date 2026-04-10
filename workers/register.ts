import { Queue, Worker } from "bullmq";
import { getConnectionOptions } from "@/lib/queue";
import type { SyncJobData, AiJobData, WebhookJobData, EmailJobData } from "@/lib/queue";
import { processStripeSyncJob } from "./sync-stripe.worker";
import { processAsaasSyncJob } from "./sync-asaas.worker";
import { processKiwifySyncJob } from "./sync-kiwify.worker";
import { processHotmartSyncJob } from "./sync-hotmart.worker";
import { processMercadoPagoSyncJob } from "./sync-mercadopago.worker";
import { processPagarmeSyncJob } from "./sync-pagarme.worker";
import { processMonetizzeSyncJob } from "./sync-monetizze.worker";
import { processPagBankSyncJob } from "./sync-pagbank.worker";
import { processGuruSyncJob } from "./sync-guru.worker";
import { processPaypalSyncJob } from "./sync-paypal.worker";
import { processEduzzSyncJob } from "./sync-eduzz.worker";
import { processCaktoSyncJob } from "./sync-cakto.worker";
import { processKirvanoSyncJob } from "./sync-kirvano.worker";
import { processAbacatePaySyncJob } from "./sync-abacatepay.worker";
import { processAiJob } from "./ai.worker";
import { processWebhookJob } from "./webhook.worker";
import { processEmailJob } from "./email.worker";
import { processCronJob, type CronJobData } from "./cron.worker";
import { db } from "@/db";
import { integrations, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createNotification } from "@/utils/create-notification";
import { sanitizeSyncError } from "@/utils/sanitize-sync-error";
import { closeRedis } from "@/lib/redis";

const workers: Worker[] = [];
const queues: Queue[] = [];

async function resolveOrgInfo(organizationId: string): Promise<{ slug: string; locale: string } | null> {
  const [org] = await db
    .select({ slug: organizations.slug, locale: organizations.locale })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!org) return null;
  const appLocale = org.locale?.startsWith("pt") ? "pt" : "en";
  return { slug: org.slug, locale: appLocale };
}

export async function startWorkers(): Promise<void> {
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
        if (job.data.provider === "kiwify") {
          return await processKiwifySyncJob(job);
        }
        if (job.data.provider === "hotmart") {
          return await processHotmartSyncJob(job);
        }
        if (job.data.provider === "mercadopago") {
          return await processMercadoPagoSyncJob(job);
        }
        if (job.data.provider === "pagarme") {
          return await processPagarmeSyncJob(job);
        }
        if (job.data.provider === "monetizze") {
          return await processMonetizzeSyncJob(job);
        }
        if (job.data.provider === "pagbank") {
          return await processPagBankSyncJob(job);
        }
        if (job.data.provider === "guru") {
          return await processGuruSyncJob(job);
        }
        if (job.data.provider === "paypal") {
          return await processPaypalSyncJob(job);
        }
        if (job.data.provider === "eduzz") {
          return await processEduzzSyncJob(job);
        }
        if (job.data.provider === "cakto") {
          return await processCaktoSyncJob(job);
        }
        if (job.data.provider === "kirvano") {
          return await processKirvanoSyncJob(job);
        }
        if (job.data.provider === "abacatepay") {
          return await processAbacatePaySyncJob(job);
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
          .catch(() => { });

        const providerLabelMap: Record<string, string> = {
          stripe: "Stripe",
          asaas: "Asaas",
          kiwify: "Kiwify",
          hotmart: "Hotmart",
          mercadopago: "Mercado Pago",
          pagarme: "Pagar.me",
          monetizze: "Monetizze",
          pagbank: "PagBank",
          guru: "Guru",
          paypal: "PayPal",
          eduzz: "Eduzz",
          cakto: "Cakto",
          kirvano: "Kirvano",
          abacatepay: "AbacatePay",
        };
        const providerLabel = providerLabelMap[job.data.provider] ?? job.data.provider;

        const failOrg = await resolveOrgInfo(job.data.organizationId).catch(() => null);
        await createNotification({
          organizationId: job.data.organizationId,
          type: "sync",
          title: `Falha na sincronização ${providerLabel}`,
          body: safeMsg,
          linkUrl: failOrg ? `/${failOrg.locale}/${failOrg.slug}/settings/integrations` : undefined,
        }).catch(() => { });

        throw err;
      }
    },
    {
      connection,
      concurrency: 2,
      stalledInterval: 120_000,
      maxStalledCount: 3,
      lockDuration: 300_000,    // ← 5 minutos (estava 30s por padrão)
      lockRenewTime: 120_000   // ← renova a cada 2 min (era a cada 15s)
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

    const providerLabelMap: Record<string, string> = {
      stripe: "Stripe",
      asaas: "Asaas",
      kiwify: "Kiwify",
      hotmart: "Hotmart",
      mercadopago: "Mercado Pago",
      pagarme: "Pagar.me",
      monetizze: "Monetizze",
      pagbank: "PagBank",
      guru: "Guru",
      cakto: "Cakto",
      kirvano: "Kirvano",
      abacatepay: "AbacatePay",
    };
    const providerLabel = providerLabelMap[job.data.provider] ?? job.data.provider;
    const payments = (result?.invoicesSynced ?? result?.paymentsSynced ?? 0) + (result?.oneTimePurchasesSynced ?? 0);
    const subs = result?.subscriptionsSynced ?? 0;

    const okOrg = await resolveOrgInfo(job.data.organizationId).catch(() => null);
    await createNotification({
      organizationId: job.data.organizationId,
      type: "sync",
      title: `Sincronização ${providerLabel} concluída`,
      body: `${subs} assinatura${subs !== 1 ? "s" : ""} e ${payments} pagamento${payments !== 1 ? "s" : ""} sincronizados.`,
      linkUrl: okOrg ? `/${okOrg.locale}/${okOrg.slug}/settings/integrations` : undefined,
    }).catch(() => { });
  });

  syncWorker.on("failed", (job, err) => {
    console.error(`[sync-worker] Job ${job?.id} failed:`, err.message);
  });

  syncWorker.on("error", (err) => {
    console.error("[sync-worker] Worker error:", err);
  });

  workers.push(syncWorker);

  const aiWorker = new Worker<AiJobData>(
    "ai",
    async (job) => {
      console.log(`[ai-worker] Starting ${job.data.type} job ${job.id}`);
      return await processAiJob(job);
    },
    {
      connection,
      concurrency: 2,
      stalledInterval: 60_000,
      maxStalledCount: 2,
      lockDuration: 120_000,
      lockRenewTime: 30_000,
    },
  );

  aiWorker.on("completed", (job) => {
    console.log(`[ai-worker] Job ${job.id} completed`);
  });

  aiWorker.on("failed", (job, err) => {
    console.error(`[ai-worker] Job ${job?.id} failed:`, err.message);
  });

  aiWorker.on("error", (err) => {
    console.error("[ai-worker] Worker error:", err);
  });

  workers.push(aiWorker);

  const webhookWorker = new Worker<WebhookJobData>(
    "webhooks",
    async (job) => {
      console.log(`[webhook-worker] Processing ${job.data.provider} webhook for org ${job.data.organizationId}`);
      return await processWebhookJob(job);
    },
    {
      connection,
      concurrency: 5,
      stalledInterval: 60_000,
      maxStalledCount: 3,
      lockDuration: 120_000,
      lockRenewTime: 30_000,
    },
  );

  webhookWorker.on("completed", (job) => {
    console.log(`[webhook-worker] Job ${job.id} completed`);
  });

  webhookWorker.on("failed", (job, err) => {
    console.error(`[webhook-worker] Job ${job?.id} failed:`, err.message);
  });

  webhookWorker.on("error", (err) => {
    console.error("[webhook-worker] Worker error:", err);
  });

  workers.push(webhookWorker);

  const emailWorker = new Worker<EmailJobData>(
    "email",
    async (job) => {
      console.log(`[email-worker] Sending to ${job.data.to}`);
      return await processEmailJob(job);
    },
    {
      connection,
      concurrency: 10,
      stalledInterval: 30_000,
      maxStalledCount: 2,
      lockDuration: 60_000,
      lockRenewTime: 15_000,
    },
  );

  emailWorker.on("completed", (job) => {
    console.log(`[email-worker] Job ${job.id} completed`);
  });

  emailWorker.on("failed", (job, err) => {
    console.error(`[email-worker] Job ${job?.id} failed:`, err.message);
  });

  emailWorker.on("error", (err) => {
    console.error("[email-worker] Worker error:", err);
  });

  workers.push(emailWorker);

  const cronQueue = new Queue("cron", {
    connection: getConnectionOptions(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 30000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    },
  });
  queues.push(cronQueue);

  const cronWorker = new Worker<CronJobData>(
    "cron",
    async (job) => {
      console.log(`[cron-worker] Running ${job.data.cronName}`);
      return await processCronJob(job);
    },
    {
      connection,
      concurrency: 1,
      stalledInterval: 120_000,
      maxStalledCount: 1,
      lockDuration: 600_000,
      lockRenewTime: 120_000,
    },
  );

  cronWorker.on("completed", (job) => {
    console.log(`[cron-worker] ${job.data.cronName} completed`);
  });

  cronWorker.on("failed", (job, err) => {
    console.error(`[cron-worker] ${job?.data?.cronName} failed:`, err.message);
  });

  cronWorker.on("error", (err) => {
    console.error("[cron-worker] Worker error:", err);
  });

  workers.push(cronWorker);

  await registerCronSchedules(cronQueue);

  console.log("[workers] All workers started (sync, ai, webhooks, email, cron)");
}

async function registerCronSchedules(cronQueue: Queue): Promise<void> {
  const schedules: Array<{ name: string; pattern: string }> = [
    { name: "email-sequences", pattern: "0 * * * *" },
    { name: "evaluate-alerts", pattern: "0 * * * *" },
    { name: "aggregate-and-cleanup", pattern: "0 3 * * *" },
    { name: "weekly-digest", pattern: "0 11 * * 1" },
    { name: "flush-failed-events", pattern: "*/15 * * * *" },
  ];

  for (const { name, pattern } of schedules) {
    await cronQueue.upsertJobScheduler(
      `cron-${name}`,
      { pattern },
      {
        name: `cron-${name}`,
        data: { cronName: name },
        opts: {
          removeOnComplete: true,
          removeOnFail: 50,
        },
      },
    );
  }

  console.log("[cron-worker] Repeatable schedules registered");
}

export async function stopWorkers(): Promise<void> {
  console.log("[workers] Graceful shutdown initiated...");
  const timeout = 30_000;

  await Promise.race([
    Promise.all(workers.map((w) => w.close())),
    new Promise((resolve) => setTimeout(resolve, timeout)),
  ]);

  await closeRedis();
  console.log("[workers] All workers stopped");
}
