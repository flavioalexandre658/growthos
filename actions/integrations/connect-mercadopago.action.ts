"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import { MERCADOPAGO_API_BASE, mpAuthHeaders } from "@/utils/mercadopago-helpers";
import type { IIntegration } from "@/interfaces/integration.interface";

type ConnectResult = IIntegration | { error: string };

async function validateMercadoPagoAccessToken(
  accessToken: string,
): Promise<{ id: string; name: string | null } | { error: string }> {
  const res = await fetch(`${MERCADOPAGO_API_BASE}/users/me`, {
    headers: mpAuthHeaders(accessToken),
  }).catch(() => null);

  if (!res) return { error: "Não foi possível conectar ao Mercado Pago. Verifique e tente novamente." };
  if (res.status === 401 || res.status === 403) return { error: "Access Token inválido ou sem permissão." };
  if (!res.ok) return { error: `Mercado Pago API error (${res.status})` };

  const data = (await res.json()) as {
    id?: number | string;
    nickname?: string | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };

  if (!data.id) return { error: "Resposta inválida do Mercado Pago." };

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
): Promise<ConnectResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const trimmed = accessToken.trim();
    if (!trimmed) return { error: "Access Token é obrigatório." };
    if (!trimmed.startsWith("APP_USR-") && !trimmed.startsWith("TEST-")) {
      return {
        error: "Access Token inválido. Use um token que começa com APP_USR- (produção) ou TEST- (sandbox).",
      };
    }

    const validation = await validateMercadoPagoAccessToken(trimmed);
    if ("error" in validation) return { error: validation.error };

    const [row] = await db
      .insert(integrations)
      .values({
        organizationId,
        provider: "mercadopago",
        accessToken: encrypt(trimmed),
        providerAccountId: validation.id,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [integrations.organizationId, integrations.provider],
        set: {
          accessToken: encrypt(trimmed),
          providerAccountId: validation.id,
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
    return { error: err instanceof Error ? err.message : "Erro ao conectar o Mercado Pago." };
  }
}
