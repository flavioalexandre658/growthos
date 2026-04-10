"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import { ABACATEPAY_API_BASE, abacatepayAuthHeaders } from "@/utils/abacatepay-helpers";
import type { IIntegration } from "@/interfaces/integration.interface";

type ConnectResult = IIntegration | { error: string };

async function validateAbacatePayKey(apiKey: string): Promise<string | null> {
  const res = await fetch(`${ABACATEPAY_API_BASE}/billing/customers?limit=1`, {
    headers: abacatepayAuthHeaders(apiKey),
  }).catch(() => null);

  if (!res) return "Não foi possível conectar ao AbacatePay. Verifique e tente novamente.";
  if (res.status === 401 || res.status === 403) return "API Key inválida ou sem permissão.";
  if (!res.ok) return `AbacatePay API error (${res.status})`;
  return null;
}

export async function connectAbacatePay(
  organizationId: string,
  apiKey: string,
): Promise<ConnectResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const trimmed = apiKey.trim();
    if (!trimmed) return { error: "API Key é obrigatória." };

    const validationError = await validateAbacatePayKey(trimmed);
    if (validationError) return { error: validationError };

    const providerAccountId = trimmed.slice(0, 16);

    const [row] = await db
      .insert(integrations)
      .values({
        organizationId,
        provider: "abacatepay",
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
    return { error: err instanceof Error ? err.message : "Erro ao conectar o AbacatePay." };
  }
}
