import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  PAGBANK_API_BASE,
  pagbankAuthHeaders,
  pagbankEventHash,
  mapPagBankChargeStatus,
  mapPagBankPaymentMethod,
} from "@/utils/pagbank-helpers";
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
import type { PagBankCharge, PagBankCustomer } from "@/utils/pagbank-webhook-handlers";

const PAGE_SIZE = 100;

interface PagBankChargeListItem {
  id?: string | null;
  reference_id?: string | null;
  status?: string | null;
  amount?: { value?: number | null; currency?: string | null } | null;
  payment_method?: { type?: string | null } | null;
  customer?: PagBankCustomer | null;
  paid_at?: string | null;
  created_at?: string | null;
  description?: string | null;
}

interface PagBankListResponse {
  charges?: PagBankChargeListItem[];
  offset?: number;
  total_pages?: number;
  total?: number;
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

async function fetchPagBankPage(url: string, token: string): Promise<PagBankListResponse> {
  const res = await fetch(url, { headers: pagbankAuthHeaders(token) });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`PagBank API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<PagBankListResponse>;
}

async function fetchAllPagBankCharges(
  token: string,
  job: Job,
  collected: { count: number },
): Promise<PagBankChargeListItem[]> {
  const all: PagBankChargeListItem[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${PAGBANK_API_BASE}/charges?status=PAID&offset=${offset}&limit=${PAGE_SIZE}`;
    const page = await fetchPagBankPage(url, token);
    const items = page.charges ?? [];
    if (items.length === 0) break;

    all.push(...items);
    collected.count += items.length;

    report(job, {
      phase: "fetching",
      current: collected.count,
      total: page.total ?? 0,
      message: `${collected.count} cobranças encontradas...`,
    });

    offset += PAGE_SIZE;
    if (page.total_pages !== undefined && offset / PAGE_SIZE >= page.total_pages) break;
    if (items.length < PAGE_SIZE) break;
  }

  return all;
}

export async function processPagBankSyncJob(job: Job<SyncJobData>): Promise<{
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

  const token = decrypt(integration.accessToken);

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
    message: isReSync ? "Buscando atualizações do PagBank..." : "Buscando cobranças do PagBank...",
  });

  const collected = { count: 0 };
  const allCharges = await fetchAllPagBankCharges(token, job, collected);
  const totalItems = allCharges.length;

  if (!isReSync) {
    report(job, {
      phase: "deleting",
      current: 0,
      total: totalItems,
      message: "Limpando dados anteriores do PagBank...",
    });
    await db
      .delete(events)
      .where(and(eq(events.organizationId, organizationId), eq(events.provider, "pagbank")));
    await db
      .delete(payments)
      .where(and(eq(payments.organizationId, organizationId), eq(payments.provider, "pagbank")));
  }

  await caches.preloadAcquisitions(organizationId);

  report(job, {
    phase: "processing",
    current: 0,
    total: totalItems,
    message: "Processando cobranças...",
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

  for (const charge of allCharges) {
    const statusNorm = mapPagBankChargeStatus(charge.status);
    if (statusNorm !== "paid") continue;

    const grossCents = charge.amount?.value ?? 0;
    if (!grossCents) continue;

    const paidAt = charge.paid_at ? new Date(charge.paid_at) : charge.created_at ? new Date(charge.created_at) : new Date();

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

    const customerId = charge.customer?.email?.toLowerCase() ?? charge.customer?.tax_id ?? charge.id ?? "unknown";
    const acq = await caches.lookupAcquisition(organizationId, customerId);
    const paymentMethod = mapPagBankPaymentMethod(charge.payment_method?.type ?? null);
    const eventHash = pagbankEventHash(organizationId, String(charge.id));
    const base = await caches.computeBaseValue(organizationId, "BRL", orgCurrency, grossCents);

    const customerPhone = charge.customer?.phones?.length
      ? `${charge.customer.phones[0].area ?? ""}${charge.customer.phones[0].number ?? ""}`
      : null;

    const sharedRow = {
      organizationId,
      eventType: "purchase" as const,
      grossValueInCents: grossCents,
      currency: "BRL",
      baseCurrency: base.baseCurrency,
      exchangeRate: base.exchangeRate,
      baseGrossValueInCents: base.baseValueInCents,
      baseNetValueInCents: base.baseValueInCents,
      billingType: "one_time" as const,
      billingReason: null,
      billingInterval: null,
      subscriptionId: null,
      customerId,
      paymentMethod,
      provider: "pagbank",
      eventHash,
      createdAt: paidAt,
      productId: null,
      productName: charge.description ?? null,
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
        phone: customerPhone,
        eventTimestamp: paidAt,
      });
    }

    oneTimePurchasesSynced++;
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
          AND e2.provider = 'pagbank'
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
          AND p2.provider = 'pagbank'
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
      syncError: totalItems === 0 && !isReSync ? "Nenhuma venda encontrada na API PagBank." : null,
      syncJobId: null,
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));

  caches.clear();

  const completionMsg = reachedLimit
    ? `Sync concluído! ${skippedByLimit} cobranças ignoradas por limite do plano.`
    : "Sync concluído!";
  report(job, { phase: "completed", current: totalItems, total: totalItems, message: completionMsg, reachedLimit });

  return { subscriptionsSynced: subRows.length, paymentsSynced, oneTimePurchasesSynced, reachedLimit, skippedByLimit };
}
