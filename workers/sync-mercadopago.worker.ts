import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  MERCADOPAGO_API_BASE,
  mpAuthHeaders,
  mercadopagoEventHash,
  mapMercadoPagoPaymentStatus,
  mapMercadoPagoPreapprovalStatus,
  mapMercadoPagoBillingInterval,
  mapMercadoPagoPaymentMethod,
  type MPPayment,
  type MPPreapproval,
} from "@/utils/mercadopago-helpers";
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

const PAGE_SIZE = 100;
const MAX_OFFSET = 1000;
const WINDOW_DAYS = 90;
const MAX_HISTORY_DAYS = 730;

interface MPSearchResponse<T> {
  paging?: { total?: number; limit?: number; offset?: number };
  results?: T[];
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

async function fetchMPSearch<T>(
  path: string,
  accessToken: string,
): Promise<MPSearchResponse<T>> {
  const res = await fetch(`${MERCADOPAGO_API_BASE}${path}`, {
    headers: mpAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Mercado Pago API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<MPSearchResponse<T>>;
}

async function fetchPaymentsWindow(
  accessToken: string,
  beginDate: string,
  endDate: string,
  job: Job,
  collected: { count: number },
): Promise<MPPayment[]> {
  const all: MPPayment[] = [];
  let offset = 0;

  while (true) {
    const path = `/v1/payments/search?sort=date_created&criteria=desc&range=date_created&begin_date=${encodeURIComponent(
      beginDate,
    )}&end_date=${encodeURIComponent(endDate)}&offset=${offset}&limit=${PAGE_SIZE}`;
    const page = await fetchMPSearch<MPPayment>(path, accessToken);
    const items = page.results ?? [];
    if (items.length === 0) break;

    all.push(...items);
    collected.count += items.length;

    report(job, {
      phase: "fetching",
      current: collected.count,
      total: 0,
      message: `${collected.count} pagamentos encontrados...`,
    });

    offset += items.length;
    if (items.length < PAGE_SIZE) break;
    if (offset >= MAX_OFFSET) break;
  }

  return all;
}

async function fetchPreapprovals(
  accessToken: string,
  job: Job,
  collected: { count: number },
): Promise<MPPreapproval[]> {
  const all: MPPreapproval[] = [];
  let offset = 0;

  while (true) {
    const path = `/preapproval/search?offset=${offset}&limit=${PAGE_SIZE}`;
    const page = await fetchMPSearch<MPPreapproval>(path, accessToken);
    const items = page.results ?? [];
    if (items.length === 0) break;

    all.push(...items);
    collected.count += items.length;

    report(job, {
      phase: "fetching",
      current: collected.count,
      total: 0,
      message: `${collected.count} assinaturas encontradas...`,
    });

    offset += items.length;
    if (items.length < PAGE_SIZE) break;
    if (offset >= MAX_OFFSET) break;
  }

  return all;
}

function pickPaymentCustomerId(payment: MPPayment): string {
  const fromExternal = extractGrowthosCustomerId(payment.external_reference ?? null);
  if (fromExternal) return fromExternal;
  const metaValue =
    (payment.metadata?.growthos_customer_id as string | undefined) ??
    (payment.metadata?.gos_customer_id as string | undefined);
  const fromMeta = extractGrowthosCustomerId(metaValue ?? null);
  if (fromMeta) return fromMeta;
  if (payment.payer?.id) return String(payment.payer.id);
  if (payment.payer?.email) return payment.payer.email.toLowerCase();
  return String(payment.id);
}

function pickPreapprovalCustomerId(pre: MPPreapproval): string {
  const fromExternal = extractGrowthosCustomerId(pre.external_reference ?? null);
  if (fromExternal) return fromExternal;
  if (pre.payer_email) return pre.payer_email.toLowerCase();
  if (pre.payer_id) return String(pre.payer_id);
  return pre.id;
}

export async function processMercadoPagoSyncJob(job: Job<SyncJobData>): Promise<{
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

  const accessToken = decrypt(integration.accessToken);

  const budget = await getRevenueBudget(organizationId);
  let revenueAccumulated = 0;
  let reachedLimit = false;
  let skippedByLimit = 0;
  const monthStart = dayjs().startOf("month");

  const orgCurrency = await getOrgCurrency(organizationId);
  const caches = new SyncCaches();

  const isReSync = !!integration.historySyncedAt;
  const overallStart = isReSync
    ? dayjs(integration.historySyncedAt!).subtract(1, "day")
    : dayjs().subtract(MAX_HISTORY_DAYS, "day");
  const overallEnd = dayjs();

  report(job, {
    phase: "fetching",
    current: 0,
    total: 0,
    message: isReSync ? "Buscando atualizações do Mercado Pago..." : "Buscando pagamentos do Mercado Pago...",
  });

  const collected = { count: 0 };
  const allPayments: MPPayment[] = [];

  let windowStart = overallStart;
  while (windowStart.isBefore(overallEnd)) {
    const candidateEnd = windowStart.add(WINDOW_DAYS, "day");
    const windowEnd = candidateEnd.isBefore(overallEnd) ? candidateEnd : overallEnd;
    const windowPayments = await fetchPaymentsWindow(
      accessToken,
      windowStart.toISOString(),
      windowEnd.toISOString(),
      job,
      collected,
    );
    allPayments.push(...windowPayments);
    windowStart = windowEnd.add(1, "day");
  }

  report(job, {
    phase: "fetching",
    current: collected.count,
    total: 0,
    message: `${collected.count} pagamentos. Buscando assinaturas...`,
  });

  const allPreapprovals = await fetchPreapprovals(accessToken, job, collected);

  const totalItems = allPayments.length + allPreapprovals.length;

  if (!isReSync) {
    report(job, {
      phase: "deleting",
      current: 0,
      total: totalItems,
      message: "Limpando dados anteriores do Mercado Pago...",
    });
    await db
      .delete(events)
      .where(and(eq(events.organizationId, organizationId), eq(events.provider, "mercadopago")));
    await db
      .delete(payments)
      .where(and(eq(payments.organizationId, organizationId), eq(payments.provider, "mercadopago")));
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

  for (const pre of allPreapprovals) {
    const customerId = pickPreapprovalCustomerId(pre);
    const recurring = pre.auto_recurring;
    const valueDecimal = recurring?.transaction_amount ?? 0;
    const valueInCents = Math.round(valueDecimal * 100);
    const eventCurrency = (recurring?.currency_id ?? "BRL").toUpperCase();
    const billingInterval = mapMercadoPagoBillingInterval(
      recurring?.frequency_type ?? null,
      recurring?.frequency ?? null,
    );
    subIntervalMap.set(pre.id, billingInterval);

    const base = await caches.computeBaseValue(
      organizationId,
      eventCurrency,
      orgCurrency,
      valueInCents,
    );

    const startedAt = recurring?.start_date
      ? new Date(recurring.start_date)
      : pre.date_created
        ? new Date(pre.date_created)
        : new Date();

    subRows.push({
      organizationId,
      subscriptionId: pre.id,
      customerId,
      planId: pre.id,
      planName: pre.reason ?? pre.id,
      status: mapMercadoPagoPreapprovalStatus(pre.status),
      valueInCents,
      currency: eventCurrency,
      baseCurrency: base.baseCurrency,
      exchangeRate: base.exchangeRate,
      baseValueInCents: base.baseValueInCents,
      billingInterval,
      startedAt,
    });
  }

  await bulkUpsertSubscriptions(subRows);
  let processed = subRows.length;

  report(job, {
    phase: "processing",
    current: processed,
    total: totalItems,
    message: "Processando pagamentos...",
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

  for (const payment of allPayments) {
    const normalized = mapMercadoPagoPaymentStatus(payment.status);
    if (normalized !== "paid") continue;

    const grossCents = Math.round((payment.transaction_amount ?? 0) * 100);
    if (!grossCents) continue;

    const paidAt = payment.date_approved
      ? new Date(payment.date_approved)
      : payment.date_created
        ? new Date(payment.date_created)
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

    const customerId = pickPaymentCustomerId(payment);
    const acq = await caches.lookupAcquisition(organizationId, customerId);
    const preapprovalId =
      (payment.metadata?.preapproval_id as string | undefined) ??
      payment.metadata_preapproval_id ??
      null;
    const isRecurring = !!preapprovalId;
    const billingInterval: BillingInterval | null = isRecurring
      ? (subIntervalMap.get(preapprovalId!) ?? "monthly")
      : null;

    const eventCurrency = (payment.currency_id ?? "BRL").toUpperCase();
    const base = await caches.computeBaseValue(
      organizationId,
      eventCurrency,
      orgCurrency,
      grossCents,
    );

    const billingReason = isRecurring ? "subscription_cycle" : null;
    const eventType = isRecurring ? "renewal" : "purchase";
    const paymentMethod = mapMercadoPagoPaymentMethod(payment.payment_type_id ?? null);
    const eventHash = mercadopagoEventHash(organizationId, String(payment.id));

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
      subscriptionId: preapprovalId,
      customerId,
      paymentMethod,
      provider: "mercadopago",
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

    if (payment.payer) {
      const payerPhone = payment.payer.phone
        ? `${payment.payer.phone.area_code ?? ""}${payment.payer.phone.number ?? ""}`
        : null;
      customerRows.push({
        organizationId,
        customerId,
        name:
          [payment.payer.first_name, payment.payer.last_name].filter(Boolean).join(" ") || null,
        email: payment.payer.email ?? null,
        phone: payerPhone && payerPhone.length > 0 ? payerPhone : null,
        eventTimestamp: paidAt,
      });
    }

    if (isRecurring) paymentsSynced++;
    else oneTimePurchasesSynced++;
  }

  processed += allPayments.length;
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
          AND e2.provider = 'mercadopago'
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
          AND p2.provider = 'mercadopago'
          AND ABS(EXTRACT(EPOCH FROM (p2.created_at - p1.created_at))) < 30
      )
  `);

  report(job, {
    phase: "finalizing",
    current: totalItems,
    total: totalItems,
    message: "Finalizando...",
  });

  const hasData = eventRows.length > 0 || paymentRows.length > 0 || subRows.length > 0;
  await db
    .update(integrations)
    .set({
      status: "active",
      ...(hasData || isReSync ? { historySyncedAt: new Date() } : {}),
      lastSyncedAt: new Date(),
      syncError: totalItems === 0 && !isReSync ? "Nenhuma venda encontrada na API Mercado Pago." : null,
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
