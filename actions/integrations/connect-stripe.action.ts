"use server";

import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import type { IIntegration } from "@/interfaces/integration.interface";

type ConnectResult = IIntegration | { error: string };

export async function connectStripe(
  organizationId: string,
  rawKey: string,
): Promise<ConnectResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const stripe = new Stripe(rawKey);

    const validationResult = await stripe.subscriptions
      .list({ limit: 1 })
      .catch((err: unknown) => {
        const stripeErr = err as { type?: string; code?: string };
        if (
          stripeErr?.type === "StripeAuthenticationError" ||
          stripeErr?.code === "api_key_expired"
        ) {
          return { error: "Restricted Key inválida ou expirada. Verifique e tente novamente." };
        }
        if (stripeErr?.type === "StripePermissionError") {
          return { error: "A key precisa de permissão Read em Subscriptions." };
        }
        return { error: "Não foi possível validar a key. Verifique e tente novamente." };
      });

    if (validationResult && "error" in validationResult) {
      return validationResult as { error: string };
    }

    if (!validationResult) {
      return { error: "Não foi possível validar a key. Verifique e tente novamente." };
    }

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
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao conectar o Stripe." };
  }
}
