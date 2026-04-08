import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/crypto";
import type { IIntegrationMeta } from "@/db/schema/integration.schema";

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
}

interface CachedIntegration {
  id: string;
  providerMeta: IIntegrationMeta | null;
}

export async function getOAuthAccessToken(
  integration: CachedIntegration,
  refresh: () => Promise<OAuthTokenResponse>,
): Promise<string> {
  const meta = integration.providerMeta ?? {};
  const cachedToken = meta.oauthAccessToken;
  const expiresAt = meta.oauthTokenExpiresAt ?? 0;
  const now = Date.now();

  if (cachedToken && expiresAt - now > REFRESH_MARGIN_MS) {
    try {
      return decrypt(cachedToken);
    } catch {
      // fall through to refresh
    }
  }

  const fresh = await refresh();
  const newExpiresAt = now + fresh.expires_in * 1000;

  const newMeta: IIntegrationMeta = {
    ...meta,
    oauthAccessToken: encrypt(fresh.access_token),
    oauthTokenExpiresAt: newExpiresAt,
  };

  await db
    .update(integrations)
    .set({ providerMeta: newMeta, updatedAt: new Date() })
    .where(eq(integrations.id, integration.id));

  integration.providerMeta = newMeta;

  return fresh.access_token;
}

export function extractGrowthosCustomerId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("gos_") ? trimmed.slice(4) : trimmed;
}
