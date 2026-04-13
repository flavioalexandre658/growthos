import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  EDUZZ_API_BASE,
  eduzzEventHash,
  mapEduzzTransactionStatus,
  mapEduzzSubscriptionStatus,
  mapEduzzBillingInterval,
  mapEduzzPaymentMethod,
} from "@/utils/eduzz-helpers";
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

const PAGE_SIZE = 100;

interface EduzzSale {
  sale_id?: string | number;
  trans_cod?: string | number;
  sale_status?: number | string;
  trans_status?: number | string;
  sale_amount?: number;
  sale_net?: number;
  trans_value?: number;
  sale_currency?: string;
  trans_currency?: string;
  sale_date?: string;
  trans_createdate?: string;
  trans_paiddate?: string;
  payment_method?: string;
  client_name?: string;
  client_email?: string;
  cus_name?: string;
  cus_email?: string;
  cus_taxnumber?: string;
  cus_tel?: string;
  content_id?: string | number;
  content_title?: string;
  product_cod?: string | number;
  product_name?: string;
  recurrence_cod?: string | number;
  recurrence_status?: number | string;
  recurrence_plan?: string;
  recurrence_interval?: number;
  recurrence_interval_type?: string;
}

interface EduzzListResponse {
  data?: EduzzSale[];
  paginator?: {
    totalResults?: number;
    totalPages?: number;
    currentPage?: number;
  };
  success?: boolean;
}

function eduzzAuthHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Token: apiKey,
  };
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

async function fetchEduzzPage(url: string, apiKey: string): Promise<EduzzListResponse> {
  const res = await fetch(url, { headers: eduzzAuthHeaders(apiKey) });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Eduzz API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<EduzzListResponse>;
}

async function fetchAllEduzzSales(
  apiKey: string,
  job: Job,
  collected: { count: number },
): Promise<EduzzSale[]> {
  const all: EduzzSale[] = [];
  let page = 1;

  while (true) {
    const url = `${EDUZZ_API_BASE}/sale/get_sale_list?page=${page}&per_page=${PAGE_SIZE}`;
    let response: EduzzListResponse;
    try {
      response = await fetchEduzzPage(url, apiKey);
    } catch {
      break;
    }

    const items = response.data ?? [];
    if (items.length === 0) break;

    all.push(...items);
    collected.count += items.length;

    report(job, {
      phase: "fetching",
      current: collected.count,
      total: response.paginator?.totalResults ?? 0,
      message: `${collected.count} vendas encontradas...`,
    });

    page++;
    if (response.paginator?.totalPages && page > response.paginator.totalPages) break;
    if (items.length < PAGE_SIZE) break;
    if (page > 1000) break;
  }

  return all;
}

export async function processEduzzSyncJob(job: Job<SyncJobData>): Promise<{
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

  const credJson = decrypt(integration.accessToken);
  const credentials = JSON.parse(credJson) as { publicKey: string; apiKey: string };

  const budget = await getRevenueBudget(organizationId);
  let revenueAccumulated = 0;
  let reachedLimit = false;
  let skippedByLimit = 0;
  const monthStart = dayjs().startOf("month");

  const orgCurrency = await getOrgCurrency(organizationId);
  const caches = new SyncCaches();
  const isReSync = !!integration.historySyncedAt;

  report(job, {
    phase: "fetching",
    current: 0,
    total: 0,
    message: isReSync ? "Buscando atualizações da Eduzz..." : "Buscando vendas da Eduzz...",
  });

  const collected = { count: 0 };
  const allSales = await fetchAllEduzzSales(credentials.apiKey, job, collected);
  const totalItems = allSales.length;

  if (!isReSync) {
    report(job, {
      phase: "deleting",
      current: 0,
      total: totalItems,
      message: "Limpando dados anteriores da Eduzz...",
    });
    await db
      .delete(events)
      .where(and(eq(events.organizationId, organizationId), eq(events.provider, "eduzz")));
    await db
      .delete(payments)
      .where(and(eq(payments.organizationId, organizationId), eq(payments.provider, "eduzz")));
  }

  await caches.preloadAcquisitions(organizationId);

  report(job, {
    phase: "processing",
    current: 0,
    total: totalItems,
    message: "Processando vendas...",
  });

  const subRows: (typeof subscriptions.$inferInsert)[] = [];
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
  const seenSubIds = new Set<string>();

  let paymentsSynced = 0;
  let oneTimePurchasesSynced = 0;

  for (const sale of allSales) {
    const status = mapEduzzTransactionStatus(sale.sale_status ?? sale.trans_status);
    if (status !== "paid") continue;

    const grossCents = Math.round((sale.sale_amount ?? sale.trans_value ?? 0) * 100);
    if (!grossCents) continue;

    const transCod = String(sale.trans_cod ?? sale.sale_id ?? "");
    if (!transCod) continue;

    const dateStr = sale.trans_paiddate ?? sale.sale_date ?? sale.trans_createdate;
    const paidAt = dateStr ? new Date(dateStr) : new Date();

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

    const email = (sale.client_email ?? sale.cus_email ?? "").toLowerCase();
    const customerId = email || sale.cus_taxnumber || transCod;
    const acq = await caches.lookupAcquisition(organizationId, customerId);

    const subCode = sale.recurrence_cod ? String(sale.recurrence_cod) : null;
    const recurring = !!subCode;
    const billingInterval: BillingInterval | null = recurring
      ? mapEduzzBillingInterval(sale.recurrence_interval_type, sale.recurrence_interval)
      : null;

    if (recurring && subCode && !seenSubIds.has(subCode)) {
      seenSubIds.add(subCode);
      const subBase = await caches.computeBaseValue(organizationId, "BRL", orgCurrency, grossCents);
      subRows.push({
        organizationId,
        subscriptionId: subCode,
        customerId,
        planId: sale.product_cod ? String(sale.product_cod) : (sale.content_id ? String(sale.content_id) : subCode),
        planName: sale.recurrence_plan ?? sale.product_name ?? sale.content_title ?? subCode,
        status: mapEduzzSubscriptionStatus(sale.recurrence_status),
        valueInCents: grossCents,
        currency: "BRL",
        baseCurrency: subBase.baseCurrency,
        exchangeRate: subBase.exchangeRate,
        baseValueInCents: subBase.baseValueInCents,
        billingInterval: billingInterval ?? "monthly",
        startedAt: paidAt,
      });
    }

    const eventCurrency = (sale.sale_currency ?? sale.trans_currency ?? "BRL").toUpperCase();
    const netCents = sale.sale_net ? Math.round(sale.sale_net * 100) : grossCents;
    const base = await caches.computeBaseValue(organizationId, eventCurrency, orgCurrency, grossCents);
    const paymentMethod = mapEduzzPaymentMethod(sale.payment_method);
    const eventHash = eduzzEventHash(organizationId, transCod);

    const sharedRow = {
      organizationId,
      eventType: "purchase",
      grossValueInCents: grossCents,
      currency: eventCurrency,
      baseCurrency: base.baseCurrency,
      exchangeRate: base.exchangeRate,
      baseGrossValueInCents: base.baseValueInCents,
      baseNetValueInCents: Math.round(netCents * base.exchangeRate),
      billingType: recurring ? ("recurring" as const) : ("one_time" as const),
      billingReason: recurring ? "subscription_cycle" : null,
      billingInterval,
      subscriptionId: subCode,
      customerId,
      paymentMethod,
      provider: "eduzz",
      eventHash,
      createdAt: paidAt,
      productId: sale.product_cod ? String(sale.product_cod) : (sale.content_id ? String(sale.content_id) : null),
      productName: sale.product_name ?? sale.content_title ?? null,
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

    const name = sale.client_name ?? sale.cus_name ?? null;
    if (email || name) {
      customerRows.push({
        organizationId,
        customerId,
        name,
        email: email || null,
        phone: sale.cus_tel ?? null,
        eventTimestamp: paidAt,
      });
    }

    if (recurring) paymentsSynced++;
    else oneTimePurchasesSynced++;
  }

  report(job, {
    phase: "processing",
    current: totalItems,
    total: totalItems,
    message: "Inserindo dados no banco...",
  });

  await bulkUpsertSubscriptions(subRows);
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
          AND e2.provider = 'eduzz'
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
          AND p2.provider = 'eduzz'
          AND ABS(EXTRACT(EPOCH FROM (p2.created_at - p1.created_at))) < 30
      )
  `);

  report(job, { phase: "finalizing", current: totalItems, total: totalItems, message: "Finalizando..." });

  const hasData = eventRows.length > 0 || paymentRows.length > 0 || subRows.length > 0;
  await db
    .update(integrations)
    .set({
      status: "active",
      ...(hasData || isReSync ? { historySyncedAt: new Date() } : {}),
      lastSyncedAt: new Date(),
      syncError: totalItems === 0 && !isReSync ? "Nenhuma venda encontrada na API Eduzz." : null,
      syncJobId: null,
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));

  caches.clear();

  const completionMsg = reachedLimit
    ? `Sync concluído! ${skippedByLimit} vendas ignoradas por limite do plano.`
    : "Sync concluído!";
  report(job, { phase: "completed", current: totalItems, total: totalItems, message: completionMsg, reachedLimit });

  return { subscriptionsSynced: subRows.length, paymentsSynced, oneTimePurchasesSynced, reachedLimit, skippedByLimit };
}
