"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import { PAGBANK_API_BASE, pagbankAuthHeaders } from "@/utils/pagbank-helpers";
import type { IIntegration } from "@/interfaces/integration.interface";
import type { IIntegrationMeta } from "@/db/schema/integration.schema";

type ConnectResult = IIntegration | { error: string };

async function validatePagBankToken(token: string): Promise<string | null> {
  const res = await fetch(`${PAGBANK_API_BASE}/orders?offset=0&limit=1`, {
    headers: pagbankAuthHeaders(token),
  }).catch(() => null);

  if (!res) return "Não foi possível conectar ao PagBank. Verifique e tente novamente.";
  if (res.status === 401 || res.status === 403) return "Token inválido ou sem permissão.";
  if (!res.ok && res.status !== 404) return `PagBank API error (${res.status})`;
  return null;
}

export async function connectPagBank(
  organizationId: string,
  token: string,
): Promise<ConnectResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const trimmed = token.trim();
    if (!trimmed) return { error: "Token é obrigatório." };

    const validationError = await validatePagBankToken(trimmed);
    if (validationError) return { error: validationError };

    const providerAccountId = trimmed.slice(0, 16);

    const meta: IIntegrationMeta = {
      webhookSecret: encrypt(trimmed),
    };

    const [row] = await db
      .insert(integrations)
      .values({
        organizationId,
        provider: "pagbank",
        accessToken: encrypt(trimmed),
        providerAccountId,
        providerMeta: meta,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [integrations.organizationId, integrations.provider],
        set: {
          accessToken: encrypt(trimmed),
          providerAccountId,
          providerMeta: meta,
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

    return { ...row, hasWebhookSecret: true } as IIntegration;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao conectar o PagBank." };
  }
}
