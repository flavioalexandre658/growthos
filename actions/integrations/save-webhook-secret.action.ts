"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt } from "@/lib/crypto";

export async function saveWebhookSecret(
  organizationId: string,
  integrationId: string,
  webhookSecret: string,
): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const [existing] = await db
    .select({ providerMeta: integrations.providerMeta })
    .from(integrations)
    .where(
      and(
        eq(integrations.id, integrationId),
        eq(integrations.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!existing) throw new Error("Integração não encontrada.");

  await db
    .update(integrations)
    .set({
      providerMeta: {
        ...(existing.providerMeta ?? {}),
        webhookSecret: encrypt(webhookSecret),
      },
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));
}
