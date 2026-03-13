import type { Job } from "bullmq";
import type { WebhookJobData } from "@/lib/queue";
import { invalidateOrgDashboardCache } from "@/lib/cache";

export async function processWebhookJob(job: Job<WebhookJobData>) {
  const { provider, organizationId, payload } = job.data;

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  const secret = process.env.WEBHOOK_RETRY_SECRET ?? process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("WEBHOOK_RETRY_SECRET or CRON_SECRET not configured");
  }

  const res = await fetch(`${baseUrl}/api/webhooks/retry`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      provider,
      integrationId: job.data.integrationId,
      organizationId,
      payload,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Webhook retry failed (${res.status}): ${text}`);
  }

  invalidateOrgDashboardCache(organizationId).catch(() => {});

  return { processed: true, provider };
}
