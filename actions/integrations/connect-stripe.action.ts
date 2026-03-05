"use server";

import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import type { IIntegration } from "@/interfaces/integration.interface";

export async function connectStripe(
  organizationId: string,
  rawKey: string,
): Promise<IIntegration> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const stripe = new Stripe(rawKey);

  // Restricted Keys cannot call accounts.retrieve() — that requires a full secret key.
  // Validate by listing subscriptions (requires the Read permission we actually need).
  const validationResult = await stripe.subscriptions
    .list({ limit: 1 })
    .catch((err: unknown) => {
      const stripeErr = err as { type?: string; code?: string };
      if (
        stripeErr?.type === "StripeAuthenticationError" ||
        stripeErr?.code === "api_key_expired"
      ) {
        throw new Error("Restricted Key inválida ou expirada. Verifique e tente novamente.");
      }
      if (stripeErr?.type === "StripePermissionError") {
        throw new Error("A key precisa de permissão Read em Subscriptions.");
      }
      throw new Error("Não foi possível validar a key. Verifique e tente novamente.");
    });

  if (!validationResult) {
    throw new Error("Não foi possível validar a key. Verifique e tente novamente.");
  }

  // Derive a stable account identifier from the key prefix (rk_live_xxx → first 24 chars)
  const providerAccountId = rawKey.slice(0, 24);

  const [row] = await db
    .insert(integrations)
    .values({
      organizationId,
      provider: "stripe",
      accessToken: encrypt(rawKey),
      providerAccountId,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [integrations.organizationId, integrations.provider],
      set: {
        accessToken: encrypt(rawKey),
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
