"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import { kiwifyOAuthToken } from "@/utils/kiwify-helpers";
import type { IIntegration } from "@/interfaces/integration.interface";
import type { IIntegrationMeta } from "@/db/schema/integration.schema";

interface KiwifyCredentials {
  clientId: string;
  clientSecret: string;
  accountId: string;
}

type ConnectResult = IIntegration | { error: string };

export async function connectKiwify(
  organizationId: string,
  credentials: KiwifyCredentials,
): Promise<ConnectResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const clientId = credentials.clientId.trim();
    const clientSecret = credentials.clientSecret.trim();
    const accountId = credentials.accountId.trim();

    if (!clientId || !clientSecret || !accountId) {
      return { error: "client_secret, client_id e account_id são obrigatórios." };
    }

    let oauth: { access_token: string; expires_in: number };
    try {
      oauth = await kiwifyOAuthToken(clientId, clientSecret);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao obter token do Kiwify." };
    }

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
        providerAccountId: accountId,
        providerMeta: meta,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [integrations.organizationId, integrations.provider],
        set: {
          accessToken: encrypt(credJson),
          providerAccountId: accountId,
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
    return { error: err instanceof Error ? err.message : "Erro ao conectar o Kiwify." };
  }
}
