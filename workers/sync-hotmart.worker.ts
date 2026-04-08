import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  HOTMART_API_BASE,
  hotmartAuthHeaders,
  hotmartEventHash,
  hotmartOAuthToken,
  mapHotmartBillingInterval,
  mapHotmartPaymentMethod,
  mapHotmartSubscriptionStatus,
} from "@/utils/hotmart-helpers";
import { getOAuthAccessToken, extractGrowthosCustomerId } from "@/utils/oauth-token-cache";
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

const PAGE_SIZE = 50;
const MAX_HISTORY_DAYS = 730;

interface HotmartBuyer {
  ucode?: string | null;
  name?: string | null;
  email?: string | null;
  document?: string | null;
  checkout_phone?: string | null;
}

interface HotmartProduct {
  id?: number | string | null;
  name?: string | null;
  ucode?: string | null;
  has_co_production?: boolean | null;
}

interface HotmartPrice {
  value?: number | null;
  currency_value?: string | null;
}

interface HotmartCommissionAs {
  source?: string | null;
  currency_conversion?: number | null;
}

interface HotmartPurchase {
  transaction?: string | null;
  order_date?: number | null;
  approved_date?: number | null;
  status?: string | null;
  recurrence_number?: number | null;
  is_subscription?: boolean | null;
  payment?: { type?: string | null; method?: string | null; installments_number?: number | null } | null;
  price?: HotmartPrice | null;
  full_price?: HotmartPrice | null;
  offer?: { code?: string | null } | null;
  sck?: string | null;
  business_model?: string | null;
}

interface HotmartSubscriberAt {
  code?: string | null;
  status?: string | null;
}

interface HotmartPlan {
  name?: string | null;
  recurrence_period?: string | null;
}

interface HotmartSubscriptionAt {
  status?: string | null;
  plan?: HotmartPlan | null;
  subscriber?: HotmartSubscriberAt | null;
}

interface HotmartSaleItem {
  buyer?: HotmartBuyer | null;
  product?: HotmartProduct | null;
  purchase?: HotmartPurchase | null;
  subscription?: HotmartSubscriptionAt | null;
  commissions?: HotmartCommissionAs[] | null;
  affiliation?: unknown;
}

interface HotmartListResponse<T> {
  items: T[];
  page_info?: {
    next_page_token?: string | null;
    prev_page_token?: string | null;
    results_per_page?: number;
    total_results?: number;
  };
}

interface HotmartSubscriptionListItem {
  subscription_id?: number | string;
  subscriber_code?: string | null;
  status?: string | null;
  accession_date?: number | null;
  end_accession_date?: number | null;
  request_date?: number | null;
  date_next_charge?: number | null;
  product?: HotmartProduct | null;
  plan?: HotmartPlan | null;
  price?: HotmartPrice | null;
  subscriber?: { name?: string | null; email?: string | null; ucode?: string | null } | null;
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

async function fetchHotmartPage<T>(
  url: string,
  accessToken: string,
): Promise<HotmartListResponse<T>> {
  const res = await fetch(url, { headers: hotmartAuthHeaders(accessToken) });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Hotmart API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<HotmartListResponse<T>>;
}

async function fetchAllHotmart<T>(
  basePath: string,
  refreshToken: () => Promise<string>,
  job: Job,
  label: string,
  collected: { count: number },
): Promise<T[]> {
  const all: T[] = [];
  let nextPageToken: string | null = null;

  while (true) {
    const sep = basePath.includes("?") ? "&" : "?";
    const tokenParam = nextPageToken ? `&page_token=${encodeURIComponent(nextPageToken)}` : "";
    const url = `${HOTMART_API_BASE}${basePath}${sep}max_results=${PAGE_SIZE}${tokenParam}`;

    let token = await refreshToken();
    let page: HotmartListResponse<T>;
    try {
      page = await fetchHotmartPage<T>(url, token);
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) {
        token = await refreshToken();
        page = await fetchHotmartPage<T>(url, token);
      } else {
        throw err;
      }
    }

    const items = page.items ?? [];
    all.push(...items);
    collected.count += items.length;

    report(job, {
      phase: "fetching",
      current: collected.count,
      total: 0,
      message: `${collected.count} ${label} encontrados...`,
    });

    nextPageToken = page.page_info?.next_page_token ?? null;
    if (!nextPageToken || items.length === 0) break;
    if (all.length > 1_000_000) break; // safety
  }

  return all;
}

function pickCustomerId(item: HotmartSaleItem): string {
  const fromSck = extractGrowthosCustomerId(item.purchase?.sck ?? null);
  if (fromSck) return fromSck;
  const buyer = item.buyer;
  if (buyer?.ucode) return buyer.ucode;
  if (buyer?.email) return buyer.email.toLowerCase();
  if (buyer?.document) return buyer.document;
  return item.purchase?.transaction ?? "unknown";
}

function pickGrossInCents(item: HotmartSaleItem): number {
  const value = item.purchase?.price?.value ?? item.purchase?.full_price?.value;
  if (typeof value !== "number") return 0;
  return Math.round(value * 100);
}

function pickCurrency(item: HotmartSaleItem): string {
  return (item.purchase?.price?.currency_value ?? "BRL").toUpperCase();
}

function pickEventDate(item: HotmartSaleItem): Date {
  const epoch = item.purchase?.approved_date ?? item.purchase?.order_date;
  if (typeof epoch === "number") return new Date(epoch);
  return new Date();
}

function isItemRecurring(item: HotmartSaleItem): boolean {
  if (item.purchase?.is_subscription === true) return true;
  if (item.subscription) return true;
  if ((item.purchase?.recurrence_number ?? 0) >= 1 && item.subscription) return true;
  return false;
}

export async function processHotmartSyncJob(job: Job<SyncJobData>): Promise<{
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
  const credentials = JSON.parse(credJson) as { clientId: string; clientSecret: string };

  const refreshToken = () =>
    getOAuthAccessToken(integration, () =>
      hotmartOAuthToken(credentials.clientId, credentials.clientSecret),
    );

  const budget = await getRevenueBudget(organizationId);
  let revenueAccumulated = 0;
  let reachedLimit = false;
  let skippedByLimit = 0;
  const monthStart = dayjs().startOf("month");

  const orgCurrency = await getOrgCurrency(organizationId);
  const caches = new SyncCaches();

  const isReSync = !!integration.historySyncedAt;
  const startEpoch = isReSync
    ? dayjs(integration.historySyncedAt!).subtract(1, "day").valueOf()
    : dayjs().subtract(MAX_HISTORY_DAYS, "day").valueOf();
  const endEpoch = dayjs().valueOf();

  report(job, {
    phase: "fetching",
    current: 0,
    total: 0,
    message: isReSync ? "Buscando atualizações do Hotmart..." : "Buscando vendas do Hotmart...",
  });

  const collected = { count: 0 };
  const allSales = await fetchAllHotmart<HotmartSaleItem>(
    `/payments/api/v1/sales/history?start_date=${startEpoch}&end_date=${endEpoch}`,
    refreshToken,
    job,
    "vendas",
    collected,
  );

  report(job, {
    phase: "fetching",
    current: collected.count,
    total: 0,
    message: `${collected.count} vendas. Buscando assinaturas...`,
  });

  const allSubs = await fetchAllHotmart<HotmartSubscriptionListItem>(
    `/payments/api/v1/subscriptions`,
    refreshToken,
    job,
    "assinaturas",
    collected,
  );

  const totalItems = allSales.length + allSubs.length;

  if (!isReSync) {
    report(job, {
      phase: "deleting",
      current: 0,
      total: totalItems,
      message: "Limpando dados anteriores do Hotmart...",
    });
    await db
      .delete(events)
      .where(and(eq(events.organizationId, organizationId), eq(events.provider, "hotmart")));
    await db
      .delete(payments)
      .where(and(eq(payments.organizationId, organizationId), eq(payments.provider, "hotmart")));
  }

  await caches.preloadAcquisitions(organizationId);

  report(job, {
    phase: "processing",
    current: 0,
    total: totalItems,
    message: "Processando assinaturas...",
  });

  const subRows: (typeof subscriptions.$inferInsert)[] = [];
  for (const sub of allSubs) {
    if (!sub.subscription_id) continue;
    const customerId =
      sub.subscriber?.ucode ?? sub.subscriber?.email?.toLowerCase() ?? String(sub.subscription_id);
    const valueDecimal = sub.price?.value ?? 0;
    const valueInCents = Math.round(valueDecimal * 100);
    const eventCurrency = (sub.price?.currency_value ?? "BRL").toUpperCase();
    const billingInterval = mapHotmartBillingInterval(sub.plan?.recurrence_period ?? null);
    const baseValues = await caches.computeBaseValue(
      organizationId,
      eventCurrency,
      orgCurrency,
      valueInCents,
    );

    subRows.push({
      organizationId,
      subscriptionId: String(sub.subscription_id),
      customerId,
      planId: sub.plan?.name ?? String(sub.subscription_id),
      planName: sub.plan?.name ?? sub.product?.name ?? String(sub.subscription_id),
      status: mapHotmartSubscriptionStatus(sub.status),
      valueInCents,
      currency: eventCurrency,
      baseCurrency: baseValues.baseCurrency,
      exchangeRate: baseValues.exchangeRate,
      baseValueInCents: baseValues.baseValueInCents,
      billingInterval,
      startedAt: sub.accession_date ? new Date(sub.accession_date) : new Date(),
    });
  }

  await bulkUpsertSubscriptions(subRows);

  report(job, {
    phase: "processing",
    current: subRows.length,
    total: totalItems,
    message: "Processando vendas...",
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

  for (const item of allSales) {
    if (!item.purchase?.transaction) continue;
    const grossCents = pickGrossInCents(item);
    if (!grossCents) continue;

    if (!budget.isUnlimited) {
      const paid = dayjs(pickEventDate(item));
      if (paid.isAfter(monthStart) || paid.isSame(monthStart)) {
        if (revenueAccumulated + grossCents > budget.remainingInCents) {
          reachedLimit = true;
          skippedByLimit++;
          continue;
        }
        revenueAccumulated += grossCents;
      }
    }

    const customerId = pickCustomerId(item);
    const acq = await caches.lookupAcquisition(organizationId, customerId);
    const recurring = isItemRecurring(item);
    const recurrenceNumber = item.purchase?.recurrence_number ?? 0;
    const eventCurrency = pickCurrency(item);

    const billingInterval: BillingInterval | null = recurring
      ? mapHotmartBillingInterval(item.subscription?.plan?.recurrence_period ?? null)
      : null;

    const billingReason = recurring ? "subscription_cycle" : null;
    const eventType = recurring && recurrenceNumber > 1 ? "renewal" : "purchase";
    const paymentMethod = mapHotmartPaymentMethod(item.purchase?.payment?.type ?? null);
    const paidAt = pickEventDate(item);
    const eventHash = hotmartEventHash(organizationId, item.purchase.transaction);

    const baseVals = await caches.computeBaseValue(
      organizationId,
      eventCurrency,
      orgCurrency,
      grossCents,
    );

    const sharedRow = {
      organizationId,
      eventType,
      grossValueInCents: grossCents,
      currency: eventCurrency,
      baseCurrency: baseVals.baseCurrency,
      exchangeRate: baseVals.exchangeRate,
      baseGrossValueInCents: baseVals.baseValueInCents,
      baseNetValueInCents: baseVals.baseValueInCents,
      billingType: recurring ? ("recurring" as const) : ("one_time" as const),
      billingReason,
      billingInterval,
      subscriptionId: item.subscription?.subscriber?.code ?? null,
      customerId,
      paymentMethod,
      provider: "hotmart",
      eventHash,
      createdAt: paidAt,
      productId: item.product?.id ? String(item.product.id) : null,
      productName: item.product?.name ?? null,
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

    if (item.buyer) {
      customerRows.push({
        organizationId,
        customerId,
        name: item.buyer.name ?? null,
        email: item.buyer.email ?? null,
        phone: item.buyer.checkout_phone ?? null,
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
          AND e2.provider = 'hotmart'
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
          AND p2.provider = 'hotmart'
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
