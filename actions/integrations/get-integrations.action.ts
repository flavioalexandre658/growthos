"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { IIntegration } from "@/interfaces/integration.interface";

export async function getIntegrations(organizationId: string): Promise<IIntegration[]> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const rows = await db
    .select({
      id: integrations.id,
      organizationId: integrations.organizationId,
      provider: integrations.provider,
      status: integrations.status,
      providerAccountId: integrations.providerAccountId,
      lastSyncedAt: integrations.lastSyncedAt,
      historySyncedAt: integrations.historySyncedAt,
      syncError: integrations.syncError,
      providerMeta: integrations.providerMeta,
      createdAt: integrations.createdAt,
      updatedAt: integrations.updatedAt,
    })
    .from(integrations)
    .where(eq(integrations.organizationId, organizationId));

  return rows.map(({ providerMeta, ...row }) => ({
    ...row,
    hasWebhookSecret: !!providerMeta?.webhookSecret,
  })) as IIntegration[];
}
