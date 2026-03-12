"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSyncQueue } from "@/lib/queue";
import { isOrgOverRevenueLimit } from "@/utils/check-revenue-limit";

export async function syncStripeHistory(
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

  if (await isOrgOverRevenueLimit(organizationId)) {
    throw new Error("Limite de receita do plano atingido. Faça upgrade para importar dados históricos.");
  }

  const queue = getSyncQueue();
  const job = await queue.add(
    "sync-stripe",
    { organizationId, integrationId, provider: "stripe" as const },
    { jobId: `stripe-${organizationId}-${Date.now()}` },
  );

  return { jobId: job.id! };
}
