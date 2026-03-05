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

  const account = await stripe.accounts.retrieve().catch(() => null);
  if (!account) {
    throw new Error("Restricted Key inválida. Verifique e tente novamente.");
  }

  const canRead = await stripe.subscriptions
    .list({ limit: 1 })
    .then(() => true)
    .catch(() => false);

  if (!canRead) {
    throw new Error("A key precisa de permissão Read em Subscriptions.");
  }

  const [row] = await db
    .insert(integrations)
    .values({
      organizationId,
      provider: "stripe",
      accessToken: encrypt(rawKey),
      providerAccountId: account.id,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [integrations.organizationId, integrations.provider],
      set: {
        accessToken: encrypt(rawKey),
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

  return row as IIntegration;
}
