"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import { GURU_API_BASE, guruAuthHeaders } from "@/utils/guru-helpers";
import type { IIntegration } from "@/interfaces/integration.interface";

type ConnectResult = IIntegration | { error: string };

async function validateGuruToken(userToken: string): Promise<string | null> {
  const res = await fetch(`${GURU_API_BASE}/transactions?page_size=1`, {
    headers: guruAuthHeaders(userToken),
  }).catch(() => null);

  if (!res) return "Não foi possível conectar à Digital Manager Guru. Verifique e tente novamente.";
  if (res.status === 401 || res.status === 403) return "Token de API inválido ou sem permissão.";
  if (!res.ok) return `Guru API error (${res.status})`;
  return null;
}

export async function connectGuru(
  organizationId: string,
  userToken: string,
): Promise<ConnectResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const trimmed = userToken.trim();
    if (!trimmed) return { error: "Token de API é obrigatório." };

    const validationError = await validateGuruToken(trimmed);
    if (validationError) return { error: validationError };

    const providerAccountId = trimmed.slice(0, 16);

    const [row] = await db
      .insert(integrations)
      .values({
        organizationId,
        provider: "guru",
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
    return { error: err instanceof Error ? err.message : "Erro ao conectar a Guru." };
  }
}
