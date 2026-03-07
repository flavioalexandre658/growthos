"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import type { IIntegration } from "@/interfaces/integration.interface";

const ASAAS_BASE_URL = "https://api.asaas.com/v3";

async function validateAsaasApiKey(
  apiKey: string,
): Promise<{ id: string; name: string }> {
  const res = await fetch(`${ASAAS_BASE_URL}/myAccount/commercialInfo/`, {
    headers: { access_token: apiKey },
  }).catch(() => {
    throw new Error("Não foi possível conectar ao Asaas. Verifique e tente novamente.");
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("API Key inválida ou sem permissão. Verifique e tente novamente.");
  }

  if (!res.ok) {
    throw new Error("Não foi possível validar a API Key. Verifique e tente novamente.");
  }

  const data = (await res.json()) as {
    cpfCnpj?: string;
    name?: string;
    email?: string;
  };

  const accountId = data.cpfCnpj ?? data.email;

  if (!accountId) {
    throw new Error("Resposta inválida do Asaas. Verifique a API Key.");
  }

  return { id: accountId, name: data.name ?? accountId };
}

export async function connectAsaas(
  organizationId: string,
  apiKey: string,
): Promise<IIntegration> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const account = await validateAsaasApiKey(apiKey.trim());

  const [row] = await db
    .insert(integrations)
    .values({
      organizationId,
      provider: "asaas",
      accessToken: encrypt(apiKey.trim()),
      providerAccountId: account.id,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [integrations.organizationId, integrations.provider],
      set: {
        accessToken: encrypt(apiKey.trim()),
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
