"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import type { IIntegration } from "@/interfaces/integration.interface";

type ConnectResult = IIntegration | { error: string };

export async function connectCakto(
  organizationId: string,
  email: string,
): Promise<ConnectResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return { error: "E-mail é obrigatório." };

    const [row] = await db
      .insert(integrations)
      .values({
        organizationId,
        provider: "cakto",
        accessToken: encrypt(trimmed),
        providerAccountId: trimmed,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [integrations.organizationId, integrations.provider],
        set: {
          accessToken: encrypt(trimmed),
          providerAccountId: trimmed,
          status: "active",
          syncError: null,
          historySyncedAt: null,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: integrations.id,
        organizationId: integrations.organizationId,
        provider: integrations.provider,
        status: integrations.status,
        providerAccountId: integrations.providerAccountId,
        lastSyncedAt: integrations.lastSyncedAt,
        historySyncedAt: integrations.historySyncedAt,
        syncError: integrations.syncError,
        createdAt: integrations.createdAt,
        updatedAt: integrations.updatedAt,
      });

    return { ...row, hasWebhookSecret: false } as IIntegration;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao conectar a Cakto." };
  }
}
