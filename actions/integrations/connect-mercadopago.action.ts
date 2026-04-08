"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import { MERCADOPAGO_API_BASE, mpAuthHeaders } from "@/utils/mercadopago-helpers";
import type { IIntegration } from "@/interfaces/integration.interface";

async function validateMercadoPagoAccessToken(
  accessToken: string,
): Promise<{ id: string; name: string | null }> {
  const res = await fetch(`${MERCADOPAGO_API_BASE}/users/me`, {
    headers: mpAuthHeaders(accessToken),
  }).catch(() => {
    throw new Error("Não foi possível conectar ao Mercado Pago. Verifique e tente novamente.");
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Access Token inválido ou sem permissão.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Mercado Pago API error (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    id?: number | string;
    nickname?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };

  if (!data.id) {
    throw new Error("Resposta inválida do Mercado Pago.");
  }

  const name =
    data.nickname ??
    [data.first_name, data.last_name].filter(Boolean).join(" ") ??
    data.email ??
    null;

  return { id: String(data.id), name };
}

export async function connectMercadoPago(
  organizationId: string,
  accessToken: string,
): Promise<IIntegration> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const trimmed = accessToken.trim();
  if (!trimmed) throw new Error("Access Token é obrigatório.");
  if (!trimmed.startsWith("APP_USR-") && !trimmed.startsWith("TEST-")) {
    throw new Error(
      "Access Token inválido. Use um token que começa com APP_USR- (produção) ou TEST- (sandbox).",
    );
  }

  const account = await validateMercadoPagoAccessToken(trimmed);

  const [row] = await db
    .insert(integrations)
    .values({
      organizationId,
      provider: "mercadopago",
      accessToken: encrypt(trimmed),
      providerAccountId: account.id,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [integrations.organizationId, integrations.provider],
      set: {
        accessToken: encrypt(trimmed),
        providerAccountId: account.id,
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
