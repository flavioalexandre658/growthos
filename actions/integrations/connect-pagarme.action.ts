"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import { PAGARME_API_BASE, pagarmeBasicAuthHeader } from "@/utils/pagarme-helpers";
import type { IIntegration } from "@/interfaces/integration.interface";

async function validatePagarmeSecretKey(secretKey: string): Promise<void> {
  const res = await fetch(`${PAGARME_API_BASE}/orders?size=1`, {
    headers: { Authorization: pagarmeBasicAuthHeader(secretKey) },
  }).catch(() => {
    throw new Error("Não foi possível conectar à Pagar.me. Verifique e tente novamente.");
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Secret Key inválida ou sem permissão.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Pagar.me API error (${res.status}): ${text.slice(0, 200)}`);
  }
}

export async function connectPagarme(
  organizationId: string,
  secretKey: string,
): Promise<IIntegration> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const trimmed = secretKey.trim();
  if (!trimmed) throw new Error("Secret Key é obrigatória.");
  if (!trimmed.startsWith("sk_")) {
    throw new Error("Secret Key inválida. Use uma chave que começa com sk_live_ ou sk_test_.");
  }

  await validatePagarmeSecretKey(trimmed);

  const providerAccountId = trimmed.slice(0, 16);

  const [row] = await db
    .insert(integrations)
    .values({
      organizationId,
      provider: "pagarme",
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
}
