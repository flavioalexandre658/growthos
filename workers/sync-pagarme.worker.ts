import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  PAGARME_API_BASE,
  pagarmeBasicAuthHeader,
  pagarmeEventHash,
  mapPagarmeBillingInterval,
  mapPagarmePaymentMethod,
  mapPagarmeSubscriptionStatus,
} from "@/utils/pagarme-helpers";
import { extractGrowthosCustomerId } from "@/utils/oauth-token-cache";
import { getRevenueBudget } from "@/utils/check-revenue-limit";
import dayjs from "@/utils/dayjs";
import { SyncCaches } from "./shared/caches";
import {
  bulkUpsertPayments,
  bulkUpsertEvents,
  bulkUpsertSubscriptions,
  bulkUpsertCustomers,
} from "./shared/bulk-operations";
import type { SyncJobData, SyncJobProgress } from "@/lib/queue";
import type { BillingInterval } from "@/utils/billing";
import type {
  PagarmeCharge,
  PagarmeSubscription,
  PagarmeCustomer,
} from "@/utils/pagarme-webhook-handlers";

const PAGE_SIZE = 30;

interface PagarmeListResponse<T> {
  data: T[];
  paging?: { total?: number; next?: string | null; previous?: string | null };
}

async function getOrgCurrency(organizationId: string): Promise<string> {
  const [org] = await db
    .select({ currency: organizations.currency })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return org?.currency ?? "BRL";
}

function report(job: Job, progress: SyncJobProgress): void {
  job.updateProgress(progress).catch(() => {});
}

async function fetchPagarmePage<T>(
  path: string,
  secretKey: string,
): Promise<PagarmeListResponse<T>> {
  const res = await fetch(`${PAGARME_API_BASE}${path}`, {
    headers: { Authorization: pagarmeBasicAuthHeader(secretKey) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Pagar.me API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<PagarmeListResponse<T>>;
}

async function fetchAllPagarme<T>(
  basePath: string,
  secretKey: string,
  job: Job,
  label: string,
  collected: { count: number },
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;

  while (true) {
    const sep = basePath.includes("?") ? "&" : "?";
    const url = `${basePath}${sep}page=${page}&size=${PAGE_SIZE}`;
    const response = await fetchPagarmePage<T>(url, secretKey);
    const items = response.data ?? [];
    if (items.length === 0) break;

    all.push(...items);
    collected.count += items.length;

    report(job, {
      phase: "fetching",
      current: collected.count,
      total: 0,
      message: `${collected.count} ${label} encontrados...`,
    });

    if (items.length < PAGE_SIZE) break;
    page += 1;
    if (page > 5000) break;
  }

  return all;
}

function pickCustomerId(
  entity: PagarmeCharge | PagarmeSubscription | null | undefined,
): string {
  if (!entity) return "unknown";
  const metaValue =
    (entity.metadata?.growthos_customer_id as string | undefined) ??
    (entity.metadata?.gos_customer_id as string | undefined);
  const fromMeta = extractGrowthosCustomerId(metaValue ?? null);
  if (fromMeta) return fromMeta;
  const customer = entity.customer;
  if (customer?.metadata) {
    const customerMeta =
      (customer.metadata.growthos_customer_id as string | undefined) ??
      (customer.metadata.gos_customer_id as string | undefined);
    const fromCustomerMeta = extractGrowthosCustomerId(customerMeta ?? null);
    if (fromCustomerMeta) return fromCustomerMeta;
  }
  if (customer?.id) return customer.id;
  if (customer?.email) return customer.email.toLowerCase();
  if (customer?.document) return customer.document;
  return "unknown";
}

function pickCustomerPhone(customer: PagarmeCustomer | null | undefined): string | null {
  if (!customer?.phones) return null;
  const mobile = customer.phones.mobile_phone;
  if (mobile?.number) {
    return `${mobile.country_code ?? ""}${mobile.area_code ?? ""}${mobile.number}`;
  }
  const home = customer.phones.home_phone;
  if (home?.number) {
    return `${home.country_code ?? ""}${home.area_code ?? ""}${home.number}`;
  }
  return null;
}

export async function processPagarmeSyncJob(job: Job<SyncJobData>): Promise<{
  subscriptionsSynced: number;
  paymentsSynced: number;
  oneTimePurchasesSynced: number;
  reachedLimit?: boolean;
  skippedByLimit?: number;
}> {
  const { organizationId, integrationId } = job.data;

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

  const secretKey = decrypt(integration.accessToken);

  const budget = await getRevenueBudget(organizationId);
  let revenueAccumulated = 0;
  let reachedLimit = false;
  let skippedByLimit = 0;
  const monthStart = dayjs().startOf("month");

  const orgCurrency = await getOrgCurrency(organizationId);
  const caches = new SyncCaches();

  const isReSync = !!integration.historySyncedAt;
  const sinceIso = isReSync
    ? dayjs(integration.historySyncedAt!).subtract(1, "day").toISOString()
    : dayjs().subtract(730, "day").toISOString();

  report(job, {
    phase: "fetching",
    current: 0,
    total: 0,
    message: isReSync ? "Buscando atualizações da Pagar.me..." : "Buscando dados da Pagar.me...",
  });

  const collected = { count: 0 };

  const allSubs = await fetchAllPagarme<PagarmeSubscription>(
    `/subscriptions?created_since=${encodeURIComponent(sinceIso)}`,
    secretKey,
    job,
    "assinaturas",
    collected,
  );

  const allCharges = await fetchAllPagarme<PagarmeCharge>(
    `/charges?created_since=${encodeURIComponent(sinceIso)}&status=paid`,
    secretKey,
    job,
    "cobranças",
    collected,
  );

  const totalItems = allSubs.length + allCharges.length;

  if (!isReSync) {
    report(job, {
      phase: "deleting",
      current: 0,
      total: totalItems,
      message: "Limpando dados anteriores da Pagar.me...",
    });
    await db
      .delete(events)
      .where(and(eq(events.organizationId, organizationId), eq(events.provider, "pagarme")));
    await db
      .delete(payments)
      .where(and(eq(payments.organizationId, organizationId), eq(payments.provider, "pagarme")));
  }

  await caches.preloadAcquisitions(organizationId);

  report(job, {
    phase: "processing",
    current: 0,
    total: totalItems,
    message: "Processando assinaturas...",
  });

  const subRows: (typeof subscriptions.$inferInsert)[] = [];
  const subIntervalMap = new Map<string, BillingInterval>();

  for (const sub of allSubs) {
    if (!sub.id) continue;
    const customerId = pickCustomerId(sub);
    const billingInterval = mapPagarmeBillingInterval(
      sub.interval ?? sub.plan?.interval ?? null,
      sub.interval_count ?? sub.plan?.interval_count ?? null,
    );
    subIntervalMap.set(sub.id, billingInterval);

    const item = sub.items && sub.items.length > 0 ? sub.items[0] : null;
    const valueInCents = item?.pricing_scheme?.price ?? 0;
    const eventCurrency = (sub.currency ?? "BRL").toUpperCase();
    const base = await caches.computeBaseValue(
      organizationId,
      eventCurrency,
      orgCurrency,
      valueInCents,
    );

    subRows.push({
      organizationId,
      subscriptionId: sub.id,
      customerId,
      planId: sub.plan?.id ?? sub.id,
      planName: sub.plan?.name ?? item?.description ?? sub.id,
      status: mapPagarmeSubscriptionStatus(sub.status),
      valueInCents,
      currency: eventCurrency,
      baseCurrency: base.baseCurrency,
      exchangeRate: base.exchangeRate,
      baseValueInCents: base.baseValueInCents,
      billingInterval,
      startedAt: sub.start_at ? new Date(sub.start_at) : new Date(),
    });
  }

  await bulkUpsertSubscriptions(subRows);
  let processed = subRows.length;

  report(job, {
    phase: "processing",
    current: processed,
    total: totalItems,
    message: "Processando cobranças...",
  });

  const eventRows: (typeof events.$inferInsert)[] = [];
  const paymentRows: (typeof payments.$inferInsert)[] = [];
  const customerRows: {
    organizationId: string;
    customerId: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    eventTimestamp: Date;
  }[] = [];

  let paymentsSynced = 0;
  let oneTimePurchasesSynced = 0;

  for (const charge of allCharges) {
    if (!charge.id) continue;
    const grossCents = charge.paid_amount ?? charge.amount ?? 0;
    if (!grossCents) continue;

    const paidAt = charge.paid_at
      ? new Date(charge.paid_at)
      : charge.created_at
        ? new Date(charge.created_at)
        : new Date();

    if (!budget.isUnlimited) {
      const paidDay = dayjs(paidAt);
      if (paidDay.isAfter(monthStart) || paidDay.isSame(monthStart)) {
        if (revenueAccumulated + grossCents > budget.remainingInCents) {
          reachedLimit = true;
          skippedByLimit++;
          continue;
        }
        revenueAccumulated += grossCents;
      }
    }

    const customerId = pickCustomerId(charge);
    const acq = await caches.lookupAcquisition(organizationId, customerId);
    const isRecurring = !!charge.subscription_id;
    const billingInterval: BillingInterval | null = isRecurring
      ? (subIntervalMap.get(charge.subscription_id!) ?? "monthly")
      : null;

    const eventCurrency = (charge.currency ?? "BRL").toUpperCase();
    const base = await caches.computeBaseValue(
      organizationId,
      eventCurrency,
      orgCurrency,
      grossCents,
    );

    const billingReason = isRecurring ? "subscription_cycle" : null;
    const eventType = isRecurring ? "renewal" : "purchase";
    const paymentMethod = mapPagarmePaymentMethod(charge.payment_method ?? null);
    const eventHash = pagarmeEventHash(organizationId, charge.id);

    const sharedRow = {
      organizationId,
      eventType,
      grossValueInCents: grossCents,
      currency: eventCurrency,
      baseCurrency: base.baseCurrency,
      exchangeRate: base.exchangeRate,
      baseGrossValueInCents: base.baseValueInCents,
      baseNetValueInCents: base.baseValueInCents,
      billingType: isRecurring ? ("recurring" as const) : ("one_time" as const),
      billingReason,
      billingInterval,
      subscriptionId: charge.subscription_id ?? null,
      customerId,
      paymentMethod,
      provider: "pagarme",
      eventHash,
      createdAt: paidAt,
      source: acq?.source ?? null,
      medium: acq?.medium ?? null,
      campaign: acq?.campaign ?? null,
      content: acq?.content ?? null,
      landingPage: acq?.landingPage ?? null,
      entryPage: acq?.entryPage ?? null,
      sessionId: acq?.sessionId ?? null,
    };

    eventRows.push(sharedRow);
    paymentRows.push(sharedRow);

    if (charge.customer) {
      customerRows.push({
        organizationId,
        customerId,
        name: charge.customer.name ?? null,
        email: charge.customer.email ?? null,
        phone: pickCustomerPhone(charge.customer),
        eventTimestamp: paidAt,
      });
    }

    if (isRecurring) paymentsSynced++;
    else oneTimePurchasesSynced++;
  }

  processed += allCharges.length;
  report(job, {
    phase: "processing",
    current: processed,
    total: totalItems,
    message: "Inserindo dados no banco...",
  });

  await bulkUpsertEvents(eventRows);
  await bulkUpsertPayments(paymentRows);
  await bulkUpsertCustomers(customerRows);

  await db.execute(sql`
    DELETE FROM events e1
    WHERE e1.organization_id = ${organizationId}
      AND e1.provider IS NULL
      AND EXISTS (
        SELECT 1 FROM events e2
        WHERE e2.organization_id = e1.organization_id
          AND e2.customer_id = e1.customer_id
          AND e2.event_type = e1.event_type
          AND e2.gross_value_in_cents = e1.gross_value_in_cents
          AND e2.provider = 'pagarme'
          AND ABS(EXTRACT(EPOCH FROM (e2.created_at - e1.created_at))) < 30
      )
  `);

  await db.execute(sql`
    DELETE FROM payments p1
    WHERE p1.organization_id = ${organizationId}
      AND p1.provider IS NULL
      AND EXISTS (
        SELECT 1 FROM payments p2
        WHERE p2.organization_id = p1.organization_id
          AND p2.customer_id = p1.customer_id
          AND p2.event_type = p1.event_type
          AND p2.gross_value_in_cents = p1.gross_value_in_cents
          AND p2.provider = 'pagarme'
          AND ABS(EXTRACT(EPOCH FROM (p2.created_at - p1.created_at))) < 30
      )
  `);

  report(job, {
    phase: "finalizing",
    current: totalItems,
    total: totalItems,
    message: "Finalizando...",
  });

  await db
    .update(integrations)
    .set({
      status: "active",
      historySyncedAt: new Date(),
      lastSyncedAt: new Date(),
      syncError: null,
      syncJobId: null,
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));

  caches.clear();

  const completionMsg = reachedLimit
    ? `Sync concluído! ${skippedByLimit} transações ignoradas por limite do plano.`
    : "Sync concluído!";
  report(job, {
    phase: "completed",
    current: totalItems,
    total: totalItems,
    message: completionMsg,
    reachedLimit,
  });

  return {
    subscriptionsSynced: subRows.length,
    paymentsSynced,
    oneTimePurchasesSynced,
    reachedLimit,
    skippedByLimit,
  };
}
