import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  PAYPAL_API_BASE,
  paypalAuthHeaders,
  paypalEventHash,
  paypalOAuthToken,
  parsePayPalAmount,
  mapPayPalBillingInterval,
  mapPayPalPaymentMethod,
} from "@/utils/paypal-helpers";
import { getOAuthAccessToken } from "@/utils/oauth-token-cache";
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

const PAGE_SIZE = 500;
const MAX_HISTORY_DAYS = 730;
const WINDOW_DAYS = 31;

interface PayPalTransactionInfo {
  transaction_id?: string;
  transaction_event_code?: string;
  transaction_initiation_date?: string;
  transaction_updated_date?: string;
  transaction_amount?: { value?: string; currency_code?: string };
  transaction_status?: string;
  payer_info?: {
    email_address?: string;
    payer_name?: { given_name?: string; surname?: string };
    account_id?: string;
  };
  shipping_info?: {
    name?: string;
  };
}

interface PayPalTransactionDetail {
  transaction_info?: PayPalTransactionInfo;
  payer_info?: {
    email_address?: string;
    payer_name?: { given_name?: string; surname?: string };
    account_id?: string;
  };
  cart_info?: {
    item_details?: Array<{
      item_name?: string;
      item_code?: string;
      item_quantity?: string;
      item_unit_price?: { value?: string; currency_code?: string };
    }>;
  };
}

interface PayPalTransactionListResponse {
  transaction_details?: PayPalTransactionDetail[];
  total_items?: number;
  total_pages?: number;
  page?: number;
}

async function getOrgCurrency(organizationId: string): Promise<string> {
  const [org] = await db
    .select({ currency: organizations.currency })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return org?.currency ?? "USD";
}

function report(job: Job, progress: SyncJobProgress): void {
  job.updateProgress(progress).catch(() => {});
}

async function fetchTransactionsPage(
  accessToken: string,
  startDate: string,
  endDate: string,
  page: number,
): Promise<PayPalTransactionListResponse> {
  const url = `${PAYPAL_API_BASE}/v1/reporting/transactions?start_date=${startDate}&end_date=${endDate}&fields=all&page=${page}&page_size=${PAGE_SIZE}`;
  const res = await fetch(url, { headers: paypalAuthHeaders(accessToken) });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`PayPal API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<PayPalTransactionListResponse>;
}

async function fetchTransactionsWindow(
  refreshToken: () => Promise<string>,
  startDate: string,
  endDate: string,
  job: Job,
  collected: { count: number },
): Promise<PayPalTransactionDetail[]> {
  const all: PayPalTransactionDetail[] = [];
  let page = 1;

  while (true) {
    let token = await refreshToken();
    let response: PayPalTransactionListResponse;
    try {
      response = await fetchTransactionsPage(token, startDate, endDate, page);
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) {
        token = await refreshToken();
        response = await fetchTransactionsPage(token, startDate, endDate, page);
      } else {
        throw err;
      }
    }

    const items = response.transaction_details ?? [];
    if (items.length === 0) break;

    all.push(...items);
    collected.count += items.length;

    report(job, {
      phase: "fetching",
      current: collected.count,
      total: 0,
      message: `${collected.count} transações encontradas...`,
    });

    if (items.length < PAGE_SIZE) break;
    if (response.total_pages && page >= response.total_pages) break;
    page += 1;
    if (page > 1000) break;
  }

  return all;
}

export async function processPaypalSyncJob(job: Job<SyncJobData>): Promise<{
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
  const credentials = JSON.parse(credJson) as { clientId: string; secret: string };

  const refreshToken = () =>
    getOAuthAccessToken(integration, () =>
      paypalOAuthToken(credentials.clientId, credentials.secret),
    );

  const budget = await getRevenueBudget(organizationId);
  let revenueAccumulated = 0;
  let reachedLimit = false;
  let skippedByLimit = 0;
  const monthStart = dayjs().startOf("month");

  const orgCurrency = await getOrgCurrency(organizationId);
  const caches = new SyncCaches();

  const isReSync = !!integration.historySyncedAt;
  const isoFmt = (d: dayjs.Dayjs) => d.toISOString();

  const overallStart = isReSync
    ? dayjs(integration.historySyncedAt!).subtract(1, "day")
    : dayjs().subtract(MAX_HISTORY_DAYS, "day");
  const overallEnd = dayjs();

  report(job, {
    phase: "fetching",
    current: 0,
    total: 0,
    message: isReSync ? "Buscando atualizações do PayPal..." : "Buscando transações do PayPal...",
  });

  const collected = { count: 0 };
  const allTransactions: PayPalTransactionDetail[] = [];

  let windowStart = overallStart;
  while (windowStart.isBefore(overallEnd)) {
    const candidateEnd = windowStart.add(WINDOW_DAYS, "day");
    const windowEnd = candidateEnd.isBefore(overallEnd) ? candidateEnd : overallEnd;
    const windowTxns = await fetchTransactionsWindow(
      refreshToken,
      isoFmt(windowStart),
      isoFmt(windowEnd),
      job,
      collected,
    );
    allTransactions.push(...windowTxns);
    windowStart = windowEnd.add(1, "day");
  }

  const totalItems = allTransactions.length;

  if (!isReSync) {
    report(job, {
      phase: "deleting",
      current: 0,
      total: totalItems,
      message: "Limpando dados anteriores do PayPal...",
    });
    await db
      .delete(events)
      .where(and(eq(events.organizationId, organizationId), eq(events.provider, "paypal")));
    await db
      .delete(payments)
      .where(and(eq(payments.organizationId, organizationId), eq(payments.provider, "paypal")));
  }

  await caches.preloadAcquisitions(organizationId);

  report(job, {
    phase: "processing",
    current: 0,
    total: totalItems,
    message: "Processando transações...",
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

  for (const detail of allTransactions) {
    const txInfo = detail.transaction_info;
    if (!txInfo) continue;

    const txStatus = (txInfo.transaction_status ?? "").toUpperCase();
    if (txStatus !== "S") continue;

    const amount = parsePayPalAmount(txInfo.transaction_amount as { value?: string; currency_code?: string } | undefined);
    const grossCents = Math.abs(amount.cents);
    if (!grossCents) continue;

    if (parseFloat(txInfo.transaction_amount?.value ?? "0") < 0) continue;

    const eventCurrency = amount.currency;
    const txId = txInfo.transaction_id ?? "";
    if (!txId) continue;

    const dateStr = txInfo.transaction_initiation_date ?? txInfo.transaction_updated_date;
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

    const payerInfo = detail.payer_info ?? txInfo.payer_info;
    const customerId = payerInfo?.email_address?.toLowerCase() ?? payerInfo?.account_id ?? txId;
    const acq = await caches.lookupAcquisition(organizationId, customerId);

    const eventCode = txInfo.transaction_event_code ?? "";
    const recurring = eventCode.startsWith("T0002") || eventCode.startsWith("T0004");
    const billingInterval: BillingInterval | null = recurring ? mapPayPalBillingInterval(null) : null;

    const base = await caches.computeBaseValue(organizationId, eventCurrency, orgCurrency, grossCents);
    const paymentMethod = mapPayPalPaymentMethod("paypal");
    const eventHash = paypalEventHash(organizationId, txId);

    const itemDetails = detail.cart_info?.item_details;
    const firstItem = itemDetails && itemDetails.length > 0 ? itemDetails[0] : null;

    const sharedRow = {
      organizationId,
      eventType: "purchase",
      grossValueInCents: grossCents,
      currency: eventCurrency,
      baseCurrency: base.baseCurrency,
      exchangeRate: base.exchangeRate,
      baseGrossValueInCents: base.baseValueInCents,
      baseNetValueInCents: base.baseValueInCents,
      billingType: recurring ? ("recurring" as const) : ("one_time" as const),
      billingReason: recurring ? "subscription_cycle" : null,
      billingInterval,
      subscriptionId: null as string | null,
      customerId,
      paymentMethod,
      provider: "paypal",
      eventHash,
      createdAt: paidAt,
      productId: firstItem?.item_code ?? null,
      productName: firstItem?.item_name ?? null,
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

    if (payerInfo) {
      const name = payerInfo.payer_name
        ? [payerInfo.payer_name.given_name, payerInfo.payer_name.surname].filter(Boolean).join(" ") || null
        : null;
      customerRows.push({
        organizationId,
        customerId,
        name,
        email: payerInfo.email_address ?? null,
        phone: null,
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
          AND e2.provider = 'paypal'
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
          AND p2.provider = 'paypal'
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

  return { subscriptionsSynced: subRows.length, paymentsSynced, oneTimePurchasesSynced, reachedLimit, skippedByLimit };
}
