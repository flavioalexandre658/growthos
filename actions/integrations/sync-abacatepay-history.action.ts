"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSyncQueue } from "@/lib/queue";

export async function syncAbacatePayHistory(
  organizationId: string,
  integrationId: string,
): Promise<{ jobId: string }> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.id, integrationId),
        eq(integrations.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!integration) throw new Error("Integração não encontrada.");
  if (integration.status === "disconnected") throw new Error("Integração desconectada.");

  const queue = getSyncQueue();

  if (integration.syncJobId) {
    const existingJob = await queue.getJob(integration.syncJobId);
    if (existingJob) await existingJob.remove().catch(() => {});
  }

  const job = await queue.add(
    "sync-abacatepay",
    { organizationId, integrationId, provider: "abacatepay" as const },
    { jobId: `abacatepay-${organizationId}-${Date.now()}` },
  );

  await db
    .update(integrations)
    .set({ syncJobId: job.id!, syncError: null, updatedAt: new Date() })
    .where(eq(integrations.id, integrationId));

  return { jobId: job.id! };
}
