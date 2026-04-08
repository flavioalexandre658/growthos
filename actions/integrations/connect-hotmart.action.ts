"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import {
  HOTMART_API_BASE,
  hotmartAuthHeaders,
  hotmartOAuthToken,
} from "@/utils/hotmart-helpers";
import type { IIntegration } from "@/interfaces/integration.interface";
import type { IIntegrationMeta } from "@/db/schema/integration.schema";

interface HotmartCredentials {
  clientId: string;
  clientSecret: string;
}

async function smokeTestHotmart(accessToken: string): Promise<void> {
  const url = `${HOTMART_API_BASE}/payments/api/v1/sales/history?max_results=1`;
  const res = await fetch(url, { headers: hotmartAuthHeaders(accessToken) }).catch(() => {
    throw new Error("Não foi possível conectar ao Hotmart. Verifique e tente novamente.");
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Credenciais inválidas ou sem permissão de leitura.");
  }

  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Hotmart API error (${res.status}): ${text.slice(0, 200)}`);
  }
}

export async function connectHotmart(
  organizationId: string,
  credentials: HotmartCredentials,
): Promise<IIntegration> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const clientId = credentials.clientId.trim();
  const clientSecret = credentials.clientSecret.trim();

  if (!clientId || !clientSecret) {
    throw new Error("client_id e client_secret são obrigatórios.");
  }

  const oauth = await hotmartOAuthToken(clientId, clientSecret);
  await smokeTestHotmart(oauth.access_token);

  const credJson = JSON.stringify({ clientId, clientSecret });
  const providerAccountId = clientId.slice(0, 36);

  const meta: IIntegrationMeta = {
    oauthAccessToken: encrypt(oauth.access_token),
    oauthTokenExpiresAt: Date.now() + oauth.expires_in * 1000,
  };

  const [row] = await db
    .insert(integrations)
    .values({
      organizationId,
      provider: "hotmart",
      accessToken: encrypt(credJson),
      providerAccountId,
      providerMeta: meta,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [integrations.organizationId, integrations.provider],
      set: {
        accessToken: encrypt(credJson),
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

  return { ...row, hasWebhookSecret: false } as IIntegration;
}
