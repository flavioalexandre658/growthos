"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import {
  KIWIFY_API_BASE,
  kiwifyAuthHeaders,
  kiwifyOAuthToken,
} from "@/utils/kiwify-helpers";
import type { IIntegration } from "@/interfaces/integration.interface";
import type { IIntegrationMeta } from "@/db/schema/integration.schema";

interface KiwifyCredentials {
  clientId: string;
  clientSecret: string;
  accountId: string;
}

async function validateKiwifyAccount(
  accessToken: string,
  accountId: string,
): Promise<{ id: string; name: string }> {
  const res = await fetch(`${KIWIFY_API_BASE}/account`, {
    headers: kiwifyAuthHeaders(accessToken, accountId),
  }).catch(() => {
    throw new Error("Não foi possível conectar ao Kiwify. Verifique e tente novamente.");
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Credenciais inválidas ou Account ID incorreto.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Kiwify API error (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { id?: string; name?: string; email?: string };
  return {
    id: data.id ?? accountId,
    name: data.name ?? data.email ?? accountId,
  };
}

export async function connectKiwify(
  organizationId: string,
  credentials: KiwifyCredentials,
): Promise<IIntegration> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const clientId = credentials.clientId.trim();
  const clientSecret = credentials.clientSecret.trim();
  const accountId = credentials.accountId.trim();

  if (!clientId || !clientSecret || !accountId) {
    throw new Error("client_id, client_secret e account_id são obrigatórios.");
  }

  const oauth = await kiwifyOAuthToken(clientId, clientSecret);
  const account = await validateKiwifyAccount(oauth.access_token, accountId);

  const credJson = JSON.stringify({ clientId, clientSecret, accountId });

  const meta: IIntegrationMeta = {
    oauthAccessToken: encrypt(oauth.access_token),
    oauthTokenExpiresAt: Date.now() + oauth.expires_in * 1000,
  };

  const [row] = await db
    .insert(integrations)
    .values({
      organizationId,
      provider: "kiwify",
      accessToken: encrypt(credJson),
      providerAccountId: account.id,
      providerMeta: meta,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [integrations.organizationId, integrations.provider],
      set: {
        accessToken: encrypt(credJson),
        providerAccountId: account.id,
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
