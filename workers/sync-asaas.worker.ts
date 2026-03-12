import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";
import {
  asaasEventHash,
  mapAsaasSubscriptionStatus,
  mapAsaasBillingType,
  mapAsaasBillingInterval,
} from "@/utils/asaas-helpers";
import { isOrgOverRevenueLimit } from "@/utils/check-revenue-limit";
import { SyncCaches } from "./shared/caches";
import { bulkUpsertPayments, bulkUpsertEvents, bulkUpsertSubscriptions, bulkUpsertCustomers } from "./shared/bulk-operations";
import type { SyncJobData, SyncJobProgress } from "@/lib/queue";
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

async function fetchAllAsaas<T>(basePath: string, apiKey: string): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const sep = basePath.includes("?") ? "&" : "?";
    const page = await asaasFetch<T>(`${basePath}${sep}offset=${offset}&limit=${PAGE_SIZE}`, apiKey);
    all.push(...page.data);
    hasMore = page.hasMore;
    offset += PAGE_SIZE;
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

  if (await isOrgOverRevenueLimit(organizationId)) {
    throw new Error("Limite de receita do plano atingido. Faça upgrade para importar dados históricos.");
  }

  const apiKey = decrypt(integration.accessToken);
  const orgCurrency = await getOrgCurrency(organizationId);
  const caches = new SyncCaches();

  report(job, { phase: "fetching", current: 0, total: 0, message: "Buscando subscriptions do Asaas..." });

  const allSubs = await fetchAllAsaas<AsaasSubscription>("/subscriptions", apiKey);

  report(job, {
    phase: "fetching",
    current: allSubs.length,
    total: 0,
    message: `${allSubs.length} subscriptions. Buscando pagamentos...`,
  });

  const allPayments = await fetchAllAsaas<AsaasPayment>("/payments?status=RECEIVED,CONFIRMED", apiKey);

  report(job, {
    phase: "fetching",
    current: allSubs.length + allPayments.length,
    total: 0,
    message: `${allPayments.length} pagamentos. Buscando dados de clientes...`,
  });

  const uniqueCustomerIds = new Set<string>();
  for (const p of allPayments) uniqueCustomerIds.add(p.customer);
  for (const s of allSubs) uniqueCustomerIds.add(s.customer);

  const asaasCustomerCache = new Map<string, { name: string | null; email: string | null; phone: string | null } | null>();
  let customersFetched = 0;
  for (const cid of uniqueCustomerIds) {
    const data = await fetchAsaasCustomerData(cid, apiKey);
    asaasCustomerCache.set(cid, data);
    customersFetched++;
    if (customersFetched % 20 === 0) {
      report(job, {
        phase: "fetching",
        current: customersFetched,
        total: uniqueCustomerIds.size,
        message: `Buscando clientes (${customersFetched}/${uniqueCustomerIds.size})...`,
      });
    }
  }

  const totalItems = allSubs.length + allPayments.length;

  report(job, { phase: "deleting", current: 0, total: totalItems, message: "Limpando dados anteriores do Asaas..." });

  await db.delete(events).where(and(eq(events.organizationId, organizationId), eq(events.provider, "asaas")));
  await db.delete(payments).where(and(eq(payments.organizationId, organizationId), eq(payments.provider, "asaas")));

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

    const customerId = payment.externalReference ?? payment.customer;
    const acq = await caches.lookupAcquisition(organizationId, customerId);

    const isRecurring = !!payment.subscription;
    const billingInterval = isRecurring
      ? (subIntervalMap.get(payment.subscription!) ?? "monthly")
      : undefined;

    const paidAt = payment.paymentDate ? new Date(payment.paymentDate) : new Date(payment.dateCreated);
    const billingReason = isRecurring ? "subscription_cycle" : null;
    const eventType = isRecurring ? "renewal" : "purchase";

    const grossValueInCents = Math.round(payment.value * 100);
    const netValueInCents = Math.round(payment.netValue * 100);
    const { baseCurrency, exchangeRate, baseValueInCents } = await caches.computeBaseValue(
      organizationId, "BRL", orgCurrency, grossValueInCents,
    );

    const paymentMethod = mapAsaasBillingType(payment.billingType);
    const eventHash = asaasEventHash(organizationId, payment.id);

    eventRows.push({
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

  report(job, { phase: "finalizing", current: totalItems, total: totalItems, message: "Finalizando..." });

  await db
    .update(integrations)
    .set({
      historySyncedAt: new Date(),
      lastSyncedAt: new Date(),
      syncError: null,
      syncJobId: null,
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));

  caches.clear();

  report(job, { phase: "completed", current: totalItems, total: totalItems, message: "Sync concluído!" });

  return { subscriptionsSynced: allSubs.length, paymentsSynced, oneTimePurchasesSynced };
}
