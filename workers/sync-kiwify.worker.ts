import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  KIWIFY_API_BASE,
  kiwifyAuthHeaders,
  kiwifyEventHash,
  kiwifyOAuthToken,
  mapKiwifyBillingInterval,
  mapKiwifyPaymentMethod,
} from "@/utils/kiwify-helpers";
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

const PAGE_SIZE = 100;
const MAX_HISTORY_DAYS = 730; // ~2 years (server-side event_time limit)
const WINDOW_DAYS = 90; // Kiwify limits the start_date/end_date range to 90 days

interface KiwifyCustomer {
  full_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  CPF?: string | null;
  cpf?: string | null;
  document?: string | null;
}

interface KiwifyProduct {
  product_id?: string;
  product_name?: string;
  name?: string;
  is_subscription?: boolean;
  subscription?: boolean;
  product_type?: string;
}

interface KiwifyTrackingParameters {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  src?: string | null;
  s1?: string | null;
}

interface KiwifySubscriptionInfo {
  id?: string | null;
  status?: string | null;
  plan?: { id?: string | null; name?: string | null; frequency?: string | null } | null;
  frequency?: string | null;
  next_charge_date?: string | null;
  start_date?: string | null;
}

interface KiwifySale {
  order_id: string;
  order_status?: string;
  status?: string;
  payment_method?: string | null;
  charge_amount?: number;
  product_price?: number;
  net_amount?: number;
  installments?: number;
  currency?: string;
  created_at: string;
  approved_at?: string | null;
  Customer?: KiwifyCustomer;
  customer?: KiwifyCustomer;
  Product?: KiwifyProduct;
  product?: KiwifyProduct;
  TrackingParameters?: KiwifyTrackingParameters;
  tracking_parameters?: KiwifyTrackingParameters;
  Subscription?: KiwifySubscriptionInfo;
  subscription?: KiwifySubscriptionInfo;
  Commissions?: { charge_amount?: number; net_amount?: number; currency?: string };
  commissions?: { charge_amount?: number; net_amount?: number; currency?: string };
}

interface KiwifyListResponse<T> {
  data: T[];
  pagination?: { count?: number; page_number?: number; page_size?: number };
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

function pickCustomer(sale: KiwifySale): KiwifyCustomer | null {
  return sale.Customer ?? sale.customer ?? null;
}

function pickProduct(sale: KiwifySale): KiwifyProduct | null {
  return sale.Product ?? sale.product ?? null;
}

function pickTracking(sale: KiwifySale): KiwifyTrackingParameters | null {
  return sale.TrackingParameters ?? sale.tracking_parameters ?? null;
}

function pickSubscription(sale: KiwifySale): KiwifySubscriptionInfo | null {
  return sale.Subscription ?? sale.subscription ?? null;
}

function isRecurringSale(sale: KiwifySale): boolean {
  if (pickSubscription(sale)) return true;
  const product = pickProduct(sale);
  if (!product) return false;
  if (product.is_subscription === true) return true;
  if (product.subscription === true) return true;
  if (product.product_type && product.product_type.toLowerCase().includes("subscription")) return true;
  return false;
}

function pickGrossInCents(sale: KiwifySale): number {
  // Kiwify charges are integer cents (BRL).
  const charge = sale.charge_amount ?? sale.Commissions?.charge_amount ?? sale.commissions?.charge_amount;
  if (typeof charge === "number") return Math.round(charge);
  if (typeof sale.product_price === "number") return Math.round(sale.product_price);
  return 0;
}

function pickNetInCents(sale: KiwifySale): number {
  const net = sale.net_amount ?? sale.Commissions?.net_amount ?? sale.commissions?.net_amount;
  if (typeof net === "number") return Math.round(net);
  return pickGrossInCents(sale);
}

function pickCustomerId(sale: KiwifySale): string {
  const tracking = pickTracking(sale);
  const fromTracking = extractGrowthosCustomerId(tracking?.utm_content ?? null);
  if (fromTracking) return fromTracking;
  const customer = pickCustomer(sale);
  if (customer?.email) return customer.email.toLowerCase();
  if (customer?.CPF || customer?.cpf || customer?.document) {
    return (customer.CPF ?? customer.cpf ?? customer.document)!;
  }
  return sale.order_id;
}

function pickPaidAt(sale: KiwifySale): Date {
  if (sale.approved_at) return new Date(sale.approved_at);
  return new Date(sale.created_at);
}

async function fetchSalesPage(
  accessToken: string,
  accountId: string,
  startDate: string,
  endDate: string,
  pageNumber: number,
): Promise<KiwifyListResponse<KiwifySale>> {
  const url = `${KIWIFY_API_BASE}/sales?start_date=${startDate}&end_date=${endDate}&page_number=${pageNumber}&page_size=${PAGE_SIZE}`;
  const res = await fetch(url, {
    headers: kiwifyAuthHeaders(accessToken, accountId),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Kiwify API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<KiwifyListResponse<KiwifySale>>;
}

async function fetchSalesWindow(
  refreshToken: () => Promise<string>,
  accountId: string,
  startDate: string,
  endDate: string,
  job: Job,
  collected: { count: number },
): Promise<KiwifySale[]> {
  const all: KiwifySale[] = [];
  let pageNumber = 1;

  while (true) {
    let token = await refreshToken();
    let page: KiwifyListResponse<KiwifySale>;
    try {
      page = await fetchSalesPage(token, accountId, startDate, endDate, pageNumber);
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) {
        token = await refreshToken();
        page = await fetchSalesPage(token, accountId, startDate, endDate, pageNumber);
      } else {
        throw err;
      }
    }

    const items = page.data ?? [];
    if (items.length === 0) break;

    all.push(...items);
    collected.count += items.length;

    report(job, {
      phase: "fetching",
      current: collected.count,
      total: 0,
      message: `${collected.count} vendas encontradas...`,
    });

    if (items.length < PAGE_SIZE) break;
    pageNumber += 1;
    if (pageNumber > 1000) break; // safety bound
  }

  return all;
}

export async function processKiwifySyncJob(job: Job<SyncJobData>): Promise<{
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
  const credentials = JSON.parse(credJson) as {
    clientId: string;
    clientSecret: string;
    accountId: string;
  };

  const refreshToken = () =>
    getOAuthAccessToken(integration, () =>
      kiwifyOAuthToken(credentials.clientId, credentials.clientSecret),
    );

  const budget = await getRevenueBudget(organizationId);
  let revenueAccumulated = 0;
  let reachedLimit = false;
  let skippedByLimit = 0;
  const monthStart = dayjs().startOf("month");

  const orgCurrency = await getOrgCurrency(organizationId);
  const caches = new SyncCaches();

  const isReSync = !!integration.historySyncedAt;
  const isoFmt = (d: dayjs.Dayjs) => d.format("YYYY-MM-DD");

  const overallStart = isReSync
    ? dayjs(integration.historySyncedAt!).subtract(1, "day")
    : dayjs().subtract(MAX_HISTORY_DAYS, "day");
  const overallEnd = dayjs();

  report(job, {
    phase: "fetching",
    current: 0,
    total: 0,
    message: isReSync ? "Buscando atualizações do Kiwify..." : "Buscando vendas do Kiwify...",
  });

  const collected = { count: 0 };
  const allSales: KiwifySale[] = [];

  let windowStart = overallStart;
  while (windowStart.isBefore(overallEnd)) {
    const candidateEnd = windowStart.add(WINDOW_DAYS, "day");
    const windowEnd = candidateEnd.isBefore(overallEnd) ? candidateEnd : overallEnd;
    const windowSales = await fetchSalesWindow(
      refreshToken,
      credentials.accountId,
      isoFmt(windowStart),
      isoFmt(windowEnd),
      job,
      collected,
    );
    allSales.push(...windowSales);
    windowStart = windowEnd.add(1, "day");
  }

  const totalItems = allSales.length;

  if (!isReSync) {
    report(job, {
      phase: "deleting",
      current: 0,
      total: totalItems,
      message: "Limpando dados anteriores do Kiwify...",
    });
    await db
      .delete(events)
      .where(and(eq(events.organizationId, organizationId), eq(events.provider, "kiwify")));
    await db
      .delete(payments)
      .where(and(eq(payments.organizationId, organizationId), eq(payments.provider, "kiwify")));
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

  let paymentsSynced = 0;
  let oneTimePurchasesSynced = 0;
  const seenSubIds = new Set<string>();

  for (const sale of allSales) {
    const grossCents = pickGrossInCents(sale);
    if (!grossCents) continue;

    if (!budget.isUnlimited) {
      const paid = dayjs(pickPaidAt(sale));
      if (paid.isAfter(monthStart) || paid.isSame(monthStart)) {
        if (revenueAccumulated + grossCents > budget.remainingInCents) {
          reachedLimit = true;
          skippedByLimit++;
          continue;
        }
        revenueAccumulated += grossCents;
      }
    }

    const customerId = pickCustomerId(sale);
    const acq = await caches.lookupAcquisition(organizationId, customerId);
    const product = pickProduct(sale);
    const subInfo = pickSubscription(sale);
    const isRecurring = isRecurringSale(sale);
    const billingInterval: BillingInterval | null = isRecurring
      ? mapKiwifyBillingInterval(subInfo?.frequency ?? subInfo?.plan?.frequency ?? null)
      : null;

    const paidAt = pickPaidAt(sale);
    const billingReason = isRecurring ? "subscription_cycle" : null;
    const eventType = "purchase";
    const netCents = pickNetInCents(sale);
    const eventCurrency = (sale.currency ?? sale.Commissions?.currency ?? sale.commissions?.currency ?? "BRL").toUpperCase();

    const { baseCurrency, exchangeRate, baseValueInCents } = await caches.computeBaseValue(
      organizationId,
      eventCurrency,
      orgCurrency,
      grossCents,
    );

    const paymentMethod = mapKiwifyPaymentMethod(sale.payment_method);
    const eventHash = kiwifyEventHash(organizationId, sale.order_id);

    if (isRecurring && subInfo?.id && !seenSubIds.has(subInfo.id)) {
      seenSubIds.add(subInfo.id);
      const subValueInCents = grossCents;
      const subBase = await caches.computeBaseValue(
        organizationId,
        eventCurrency,
        orgCurrency,
        subValueInCents,
      );
      subRows.push({
        organizationId,
        subscriptionId: subInfo.id,
        customerId,
        planId: subInfo.plan?.id ?? subInfo.id,
        planName: subInfo.plan?.name ?? product?.product_name ?? product?.name ?? subInfo.id,
        status: "active",
        valueInCents: subValueInCents,
        currency: eventCurrency,
        baseCurrency: subBase.baseCurrency,
        exchangeRate: subBase.exchangeRate,
        baseValueInCents: subBase.baseValueInCents,
        billingInterval: billingInterval ?? "monthly",
        startedAt: subInfo.start_date ? new Date(subInfo.start_date) : paidAt,
      });
    }

    const sharedRow = {
      organizationId,
      eventType,
      grossValueInCents: grossCents,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents: baseValueInCents,
      baseNetValueInCents: Math.round(netCents * exchangeRate),
      billingType: isRecurring ? ("recurring" as const) : ("one_time" as const),
      billingReason,
      billingInterval,
      subscriptionId: subInfo?.id ?? null,
      customerId,
      paymentMethod,
      provider: "kiwify",
      eventHash,
      createdAt: paidAt,
      productId: product?.product_id ?? null,
      productName: product?.product_name ?? product?.name ?? null,
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

    const customer = pickCustomer(sale);
    if (customer) {
      customerRows.push({
        organizationId,
        customerId,
        name: customer.full_name ?? null,
        email: customer.email ?? null,
        phone: customer.mobile ?? null,
        eventTimestamp: paidAt,
      });
    }

    if (isRecurring) paymentsSynced++;
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
          AND e2.provider = 'kiwify'
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
          AND p2.provider = 'kiwify'
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
