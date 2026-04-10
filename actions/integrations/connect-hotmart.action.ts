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

type ConnectResult = IIntegration | { error: string };

async function smokeTestHotmart(accessToken: string): Promise<string | null> {
  const url = `${HOTMART_API_BASE}/payments/api/v1/sales/history?max_results=1`;
  const res = await fetch(url, { headers: hotmartAuthHeaders(accessToken) }).catch(() => null);

  if (!res) return "Não foi possível conectar ao Hotmart. Verifique e tente novamente.";
  if (res.status === 401 || res.status === 403) return "Credenciais inválidas ou sem permissão de leitura.";
  if (!res.ok && res.status !== 404) return `Hotmart API error (${res.status})`;
  return null;
}

export async function connectHotmart(
  organizationId: string,
  credentials: HotmartCredentials,
): Promise<ConnectResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const clientId = credentials.clientId.trim();
    const clientSecret = credentials.clientSecret.trim();

    if (!clientId || !clientSecret) {
      return { error: "client_id e client_secret são obrigatórios." };
    }

    let oauth: { access_token: string; expires_in: number };
    try {
      oauth = await hotmartOAuthToken(clientId, clientSecret);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao obter token do Hotmart." };
    }

    const smokeError = await smokeTestHotmart(oauth.access_token);
    if (smokeError) return { error: smokeError };

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
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao conectar o Hotmart." };
  }
}
