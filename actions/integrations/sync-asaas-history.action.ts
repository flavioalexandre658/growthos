"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations, events, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { hashAnonymous } from "@/lib/hash";
import { eq, and } from "drizzle-orm";
import {
  asaasEventHash,
  mapAsaasSubscriptionStatus,
  mapAsaasBillingType,
  mapAsaasBillingInterval,
} from "@/utils/asaas-helpers";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import type { BillingInterval } from "@/utils/billing";

const ASAAS_BASE_URL = "https://api.asaas.com/v3";
const PAGE_SIZE = 100;

interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  cycle: string;
  status: string;
  externalReference: string | null;
  dateCreated: string;
  nextDueDate?: string | null;
  description?: string | null;
}

interface AsaasPayment {
  id: string;
  customer: string;
  subscription: string | null;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  externalReference: string | null;
  installment: string | null;
  dueDate: string;
  paymentDate: string | null;
  dateCreated: string;
  description?: string | null;
}

interface AsaasListResponse<T> {
  totalCount: number;
  hasMore: boolean;
  data: T[];
}

async function asaasFetch<T>(
  path: string,
  apiKey: string,
): Promise<AsaasListResponse<T>> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    headers: { access_token: apiKey },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Asaas API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<AsaasListResponse<T>>;
}

async function* paginateAsaas<T>(
  basePath: string,
  apiKey: string,
): AsyncGenerator<T> {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const sep = basePath.includes("?") ? "&" : "?";
    const page = await asaasFetch<T>(
      `${basePath}${sep}offset=${offset}&limit=${PAGE_SIZE}`,
      apiKey,
    );
    for (const item of page.data) {
      yield item;
    }
    hasMore = page.hasMore;
    offset += PAGE_SIZE;
  }
}

async function getOrgCurrency(organizationId: string): Promise<string> {
  const [org] = await db
    .select({ currency: organizations.currency })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return org?.currency ?? "BRL";
}

async function computeBaseValue(
  organizationId: string,
  eventCurrency: string,
  orgCurrency: string,
  grossValueInCents: number,
): Promise<{ baseCurrency: string; exchangeRate: number; baseValueInCents: number }> {
  const rate = await resolveExchangeRate(organizationId, eventCurrency, orgCurrency);
  const resolvedRate = rate ?? 1;
  return {
    baseCurrency: orgCurrency,
    exchangeRate: resolvedRate,
    baseValueInCents: Math.round(grossValueInCents * resolvedRate),
  };
}

export async function syncAsaasHistory(
  organizationId: string,
  integrationId: string,
): Promise<{
  subscriptionsSynced: number;
  paymentsSynced: number;
  oneTimePurchasesSynced: number;
}> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.id, integrationId),
        eq(integrations.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!integration) throw new Error("Integração não encontrada.");
  if (integration.status === "disconnected") throw new Error("Integração desconectada.");

  const apiKey = decrypt(integration.accessToken);
  const orgCurrency = await getOrgCurrency(organizationId);

  await db
    .delete(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.provider, "asaas"),
      ),
    );

  let subscriptionsSynced = 0;
  let paymentsSynced = 0;
  let oneTimePurchasesSynced = 0;
  const subIntervalMap = new Map<string, BillingInterval>();

  try {
    for await (const sub of paginateAsaas<AsaasSubscription>("/subscriptions", apiKey)) {
      const rawCustomerId = sub.externalReference ?? sub.customer;
      const hashedCustomerId = hashAnonymous(rawCustomerId);
      const billingInterval = mapAsaasBillingInterval(sub.cycle);
      subIntervalMap.set(sub.id, billingInterval);

      const valueInCents = Math.round(sub.value * 100);
      const { baseCurrency, exchangeRate, baseValueInCents } = await computeBaseValue(
        organizationId,
        "BRL",
        orgCurrency,
        valueInCents,
      );

      await db
        .insert(subscriptions)
        .values({
          organizationId,
          subscriptionId: sub.id,
          customerId: hashedCustomerId,
          planId: sub.id,
          planName: sub.description ?? sub.id,
          status: mapAsaasSubscriptionStatus(sub.status),
          valueInCents,
          currency: "BRL",
          baseCurrency,
          exchangeRate,
          baseValueInCents,
          billingInterval,
          startedAt: new Date(sub.dateCreated),
        })
        .onConflictDoUpdate({
          target: [subscriptions.subscriptionId],
          set: {
            status: mapAsaasSubscriptionStatus(sub.status),
            baseCurrency,
            exchangeRate,
            baseValueInCents,
            updatedAt: new Date(),
          },
        });

      subscriptionsSynced++;
    }

    for await (const payment of paginateAsaas<AsaasPayment>(
      "/payments?status=RECEIVED,CONFIRMED",
      apiKey,
    )) {
      if (!payment.value) continue;

      const rawCustomerId = payment.externalReference ?? payment.customer;
      const hashedCustomerId = hashAnonymous(rawCustomerId);
      const acq = await lookupAcquisitionContext(organizationId, hashedCustomerId);

      const isRecurring = !!payment.subscription;
      const billingInterval = isRecurring
        ? (subIntervalMap.get(payment.subscription!) ?? "monthly")
        : undefined;

      const paidAt = payment.paymentDate
        ? new Date(payment.paymentDate)
        : new Date(payment.dateCreated);

      const billingReason = isRecurring ? "subscription_cycle" : null;
      const eventType = isRecurring ? "renewal" : "purchase";

      const grossValueInCents = Math.round(payment.value * 100);
      const netValueInCents = Math.round(payment.netValue * 100);
      const { baseCurrency, exchangeRate, baseValueInCents } = await computeBaseValue(
        organizationId,
        "BRL",
        orgCurrency,
        grossValueInCents,
      );

      const paymentMethod = mapAsaasBillingType(payment.billingType);

      await db
        .insert(events)
        .values({
          organizationId,
          eventType,
          grossValueInCents,
          currency: "BRL",
          baseCurrency,
          exchangeRate,
          baseGrossValueInCents: baseValueInCents,
          baseNetValueInCents: Math.round(netValueInCents * exchangeRate),
          billingType: isRecurring ? "recurring" : "one_time",
          billingReason,
          billingInterval: (billingInterval as BillingInterval | undefined) ?? null,
          subscriptionId: payment.subscription,
          customerId: hashedCustomerId,
          paymentMethod,
          provider: "asaas",
          eventHash: asaasEventHash(organizationId, payment.id),
          createdAt: paidAt,
          source: acq?.source ?? null,
          medium: acq?.medium ?? null,
          campaign: acq?.campaign ?? null,
          content: acq?.content ?? null,
          landingPage: acq?.landingPage ?? null,
          entryPage: acq?.entryPage ?? null,
          sessionId: acq?.sessionId ?? null,
        })
        .onConflictDoUpdate({
          target: [events.organizationId, events.eventHash],
          set: {
            eventType,
            billingType: isRecurring ? "recurring" : "one_time",
            billingReason,
            billingInterval: (billingInterval as BillingInterval | undefined) ?? null,
            subscriptionId: payment.subscription,
            currency: "BRL",
            baseCurrency,
            exchangeRate,
            baseGrossValueInCents: baseValueInCents,
            baseNetValueInCents: Math.round(netValueInCents * exchangeRate),
            createdAt: paidAt,
          },
        });

      if (isRecurring) {
        paymentsSynced++;
      } else {
        oneTimePurchasesSynced++;
      }
    }

    await db
      .update(integrations)
      .set({
        historySyncedAt: new Date(),
        lastSyncedAt: new Date(),
        syncError: null,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integrationId));
  } catch (err) {
    await db
      .update(integrations)
      .set({
        status: "error",
        syncError: String(err),
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integrationId));
    throw err;
  }

  return { subscriptionsSynced, paymentsSynced, oneTimePurchasesSynced };
}
