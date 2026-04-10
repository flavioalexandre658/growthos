"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import type { IIntegration } from "@/interfaces/integration.interface";

interface EduzzCredentials {
  publicKey: string;
  apiKey: string;
}

type ConnectResult = IIntegration | { error: string };

export async function connectEduzz(
  organizationId: string,
  credentials: EduzzCredentials,
): Promise<ConnectResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const publicKey = credentials.publicKey.trim();
    const apiKey = credentials.apiKey.trim();

    if (!publicKey || !apiKey) {
      return { error: "Public Key e API Key são obrigatórios." };
    }

    const credJson = JSON.stringify({ publicKey, apiKey });
    const providerAccountId = publicKey.slice(0, 16);

    const [row] = await db
      .insert(integrations)
      .values({
        organizationId,
        provider: "eduzz",
        accessToken: encrypt(credJson),
        providerAccountId,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [integrations.organizationId, integrations.provider],
        set: {
          accessToken: encrypt(credJson),
          providerAccountId,
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
    return { error: err instanceof Error ? err.message : "Erro ao conectar a Eduzz." };
  }
}
