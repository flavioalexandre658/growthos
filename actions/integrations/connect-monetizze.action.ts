"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import { MONETIZZE_API_BASE, monetizzeAuthHeaders } from "@/utils/monetizze-helpers";
import type { IIntegration } from "@/interfaces/integration.interface";

type ConnectResult = IIntegration | { error: string };

async function validateMonetizzeApiKey(apiKey: string): Promise<string | null> {
  const res = await fetch(`${MONETIZZE_API_BASE}/token`, {
    headers: monetizzeAuthHeaders(apiKey),
  }).catch(() => null);

  if (!res) return "Não foi possível conectar à Monetizze. Verifique e tente novamente.";
  if (res.status === 401 || res.status === 403) return "Chave da API inválida ou sem permissão.";
  if (!res.ok) return `Monetizze API error (${res.status})`;
  return null;
}

export async function connectMonetizze(
  organizationId: string,
  apiKey: string,
): Promise<ConnectResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const trimmed = apiKey.trim();
    if (!trimmed) return { error: "Chave da API é obrigatória." };

    const validationError = await validateMonetizzeApiKey(trimmed);
    if (validationError) return { error: validationError };

    const providerAccountId = trimmed.slice(0, 16);

    const [row] = await db
      .insert(integrations)
      .values({
        organizationId,
        provider: "monetizze",
        accessToken: encrypt(trimmed),
        providerAccountId,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [integrations.organizationId, integrations.provider],
        set: {
          accessToken: encrypt(trimmed),
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
    return { error: err instanceof Error ? err.message : "Erro ao conectar a Monetizze." };
  }
}
