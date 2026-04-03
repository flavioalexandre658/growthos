import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  asaasEventHash,
  mapAsaasSubscriptionStatus,
  mapAsaasBillingType,
  mapAsaasBillingInterval,
} from "@/utils/asaas-helpers";
import { getRevenueBudget } from "@/utils/check-revenue-limit";
import dayjs from "@/utils/dayjs";
import { SyncCaches } from "./shared/caches";
import { bulkUpsertPayments, bulkUpsertEvents, bulkUpsertSubscriptions, bulkUpsertCustomers } from "./shared/bulk-operations";
import type { SyncJobData, SyncJobProgress } from "@/lib/queue";
import type { BillingInterval } from "@/utils/billing";

const ASAAS_BASE_URL = "https://api.asaas.com/v3";
const PAGE_SIZE = 100;
const CUSTOMER_CONCURRENCY = 10;

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

async function asaasFetch<T>(path: string, apiKey: string): Promise<AsaasListResponse<T>> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    headers: { access_token: apiKey },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Asaas API error (${res.status}): ${text}`);
  }
  return res.json() as Promise<AsaasListResponse<T>>;
}

async function fetchAllAsaas<T>(
  basePath: string,
  apiKey: string,
  onPage?: (count: number) => void,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const sep = basePath.includes("?") ? "&" : "?";
    const page = await asaasFetch<T>(`${basePath}${sep}offset=${offset}&limit=${PAGE_SIZE}`, apiKey);
    all.push(...page.data);
    hasMore = page.hasMore;
    offset += PAGE_SIZE;
    onPage?.(all.length);
  }

  return all;
}

async function fetchAsaasCustomerData(
  customerId: string,
  apiKey: string,
): Promise<{ name: string | null; email: string | null; phone: string | null } | null> {
  try {
    const res = await fetch(`${ASAAS_BASE_URL}/customers/${customerId}`, {
      headers: { access_token: apiKey },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string; email?: string; phone?: string; mobilePhone?: string };
    return {
      name: data.name ?? null,
      email: data.email ?? null,
      phone: data.phone ?? data.mobilePhone ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchCustomersInParallel(
  customerIds: string[],
  apiKey: string,
  job: Job,
  total: number,
): Promise<Map<string, { name: string | null; email: string | null; phone: string | null } | null>> {
  const cache = new Map<string, { name: string | null; email: string | null; phone: string | null } | null>();
  let fetched = 0;

  for (let i = 0; i < customerIds.length; i += CUSTOMER_CONCURRENCY) {
    const batch = customerIds.slice(i, i + CUSTOMER_CONCURRENCY);
    const results = await Promise.all(batch.map((id) => fetchAsaasCustomerData(id, apiKey)));
    results.forEach((data, idx) => {
      cache.set(batch[idx], data);
    });
    fetched += batch.length;
    if (fetched % 50 === 0 || fetched === total) {
      report(job, {
        phase: "fetching",
        current: fetched,
        total,
        message: `Buscando clientes (${fetched}/${total})...`,
      });
    }
  }

  return cache;
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

export async function processAsaasSyncJob(job: Job<SyncJobData>): Promise<{
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

  const budget = await getRevenueBudget(organizationId);
  let revenueAccumulated = 0;
  let reachedLimit = false;
  let skippedByLimit = 0;
  const monthStart = dayjs().startOf("month");

  const apiKey = decrypt(integration.accessToken);
  const orgCurrency = await getOrgCurrency(organizationId);
  const caches = new SyncCaches();

  const isReSync = !!integration.historySyncedAt;
  const sinceDate = isReSync
    ? new Date(integration.historySyncedAt!.getTime() - 86400_000)
      .toISOString()
      .slice(0, 10)
    : undefined;

  report(job, {
    phase: "fetching",
    current: 0,
    total: 0,
    message: isReSync ? "Buscando atualizações do Asaas..." : "Buscando dados do Asaas...",
  });

  const paymentsPath = sinceDate
    ? `/payments?status=RECEIVED,CONFIRMED&dateCreated[ge]=${sinceDate}`
    : "/payments?status=RECEIVED,CONFIRMED";

  const [allSubs, allPayments] = await Promise.all([
    fetchAllAsaas<AsaasSubscription>("/subscriptions", apiKey, (count) => {
      report(job, { phase: "fetching", current: count, total: 0, message: `${count} subscriptions encontradas...` });
    }),
    fetchAllAsaas<AsaasPayment>(paymentsPath, apiKey, (count) => {
      report(job, { phase: "fetching", current: count, total: 0, message: `${count} pagamentos encontrados...` });
    }),
  ]);

  report(job, {
    phase: "fetching",
    current: allSubs.length + allPayments.length,
    total: 0,
    message: `${allSubs.length} subscriptions, ${allPayments.length} pagamentos. Buscando clientes...`,
  });

  const uniqueCustomerIds = Array.from(new Set([
    ...allPayments.map((p) => p.customer),
    ...allSubs.map((s) => s.customer),
  ]));

  const asaasCustomerCache = await fetchCustomersInParallel(
    uniqueCustomerIds,
    apiKey,
    job,
    uniqueCustomerIds.length,
  );

  const totalItems = allSubs.length + allPayments.length;

  if (!isReSync) {
    report(job, { phase: "deleting", current: 0, total: totalItems, message: "Limpando dados anteriores do Asaas..." });
    await db.delete(events).where(and(eq(events.organizationId, organizationId), eq(events.provider, "asaas")));
    await db.delete(payments).where(and(eq(payments.organizationId, organizationId), eq(payments.provider, "asaas")));
  }

  await caches.preloadAcquisitions(organizationId);

  report(job, { phase: "processing", current: 0, total: totalItems, message: "Processando subscriptions..." });

  const subIntervalMap = new Map<string, BillingInterval>();
  const subRows: (typeof subscriptions.$inferInsert)[] = [];

  for (const sub of allSubs) {
    const customerId = sub.externalReference ?? sub.customer;
    const billingInterval = mapAsaasBillingInterval(sub.cycle);
    subIntervalMap.set(sub.id, billingInterval);

    const valueInCents = Math.round(sub.value * 100);
    const { baseCurrency, exchangeRate, baseValueInCents } = await caches.computeBaseValue(
      organizationId, "BRL", orgCurrency, valueInCents,
    );

    subRows.push({
      organizationId,
      subscriptionId: sub.id,
      customerId,
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
    });
  }

  await bulkUpsertSubscriptions(subRows);
  let processed = allSubs.length;

  report(job, { phase: "processing", current: processed, total: totalItems, message: "Processando pagamentos..." });

  const eventRows: (typeof events.$inferInsert)[] = [];
  const paymentRows: (typeof payments.$inferInsert)[] = [];
  const customerRows: { organizationId: string; customerId: string; name: string | null; email: string | null; phone: string | null; eventTimestamp: Date }[] = [];

  let paymentsSynced = 0;
  let oneTimePurchasesSynced = 0;

  for (const payment of allPayments) {
    if (!payment.value) continue;

    const grossCents = Math.round(payment.value * 100);
    if (!budget.isUnlimited) {
      const paidDate = payment.paymentDate ? dayjs(payment.paymentDate) : dayjs(payment.dateCreated);
      if (paidDate.isAfter(monthStart) || paidDate.isSame(monthStart)) {
        if (revenueAccumulated + grossCents > budget.remainingInCents) {
          reachedLimit = true;
          skippedByLimit++;
          continue;
        }
        revenueAccumulated += grossCents;
      }
    }

    const customerId = payment.externalReference ?? payment.customer;
    const acq = await caches.lookupAcquisition(organizationId, customerId);

    const isRecurring = !!payment.subscription;
    const billingInterval = isRecurring
      ? (subIntervalMap.get(payment.subscription!) ?? "monthly")
      : undefined;

    const paidAt = payment.paymentDate ? new Date(payment.paymentDate) : new Date(payment.dateCreated);
    const billingReason = isRecurring ? "subscription_cycle" : null;
    const eventType = isRecurring ? "renewal" : "purchase";

    const netValueInCents = Math.round(payment.netValue * 100);
    const { baseCurrency, exchangeRate, baseValueInCents } = await caches.computeBaseValue(
      organizationId, "BRL", orgCurrency, grossCents,
    );

    const paymentMethod = mapAsaasBillingType(payment.billingType);
    const eventHash = asaasEventHash(organizationId, payment.id);

    eventRows.push({
      organizationId,
      eventType,
      grossValueInCents: grossCents,
      currency: "BRL",
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents: baseValueInCents,
      baseNetValueInCents: Math.round(netValueInCents * exchangeRate),
      billingType: isRecurring ? "recurring" : "one_time",
      billingReason,
      billingInterval: (billingInterval as BillingInterval | undefined) ?? null,
      subscriptionId: payment.subscription,
      customerId,
      paymentMethod,
      provider: "asaas",
      eventHash,
      createdAt: paidAt,
      source: acq?.source ?? null,
      medium: acq?.medium ?? null,
      campaign: acq?.campaign ?? null,
      content: acq?.content ?? null,
      landingPage: acq?.landingPage ?? null,
      entryPage: acq?.entryPage ?? null,
      sessionId: acq?.sessionId ?? null,
    });

    paymentRows.push({
      organizationId,
      eventType,
      grossValueInCents: grossCents,
      currency: "BRL",
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents: baseValueInCents,
      baseNetValueInCents: Math.round(netValueInCents * exchangeRate),
      billingType: isRecurring ? "recurring" : "one_time",
      billingReason,
      billingInterval: (billingInterval as BillingInterval | undefined) ?? null,
      subscriptionId: payment.subscription,
      customerId,
      paymentMethod,
      provider: "asaas",
      eventHash,
      createdAt: paidAt,
      source: acq?.source ?? null,
      medium: acq?.medium ?? null,
      campaign: acq?.campaign ?? null,
      content: acq?.content ?? null,
      landingPage: acq?.landingPage ?? null,
      entryPage: acq?.entryPage ?? null,
      sessionId: acq?.sessionId ?? null,
    });

    const asaasCustomerData = asaasCustomerCache.get(payment.customer);
    if (asaasCustomerData) {
      customerRows.push({
        organizationId,
        customerId,
        name: asaasCustomerData.name,
        email: asaasCustomerData.email,
        phone: asaasCustomerData.phone,
        eventTimestamp: paidAt,
      });
    }

    if (isRecurring) paymentsSynced++;
    else oneTimePurchasesSynced++;
  }

  processed += allPayments.length;
  report(job, { phase: "processing", current: processed, total: totalItems, message: "Inserindo dados no banco..." });

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
          AND e2.provider = 'asaas'
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
          AND p2.amount_in_cents = p1.amount_in_cents
          AND p2.provider = 'asaas'
          AND ABS(EXTRACT(EPOCH FROM (p2.created_at - p1.created_at))) < 30
      )
  `);

  report(job, { phase: "finalizing", current: totalItems, total: totalItems, message: "Finalizando..." });

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
  report(job, { phase: "completed", current: totalItems, total: totalItems, message: completionMsg, reachedLimit });

  return { subscriptionsSynced: allSubs.length, paymentsSynced, oneTimePurchasesSynced, reachedLimit, skippedByLimit };
}
