import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  MONETIZZE_API_BASE,
  monetizzeAuthHeaders,
  monetizzeEventHash,
  mapMonetizzeStatus,
  mapMonetizzeSubscriptionStatus,
  mapMonetizzeBillingInterval,
  mapMonetizzePaymentMethod,
} from "@/utils/monetizze-helpers";
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

interface MonetizzeVenda {
  venda?: {
    codigo?: string | null;
    status?: string | null;
    codigo_status?: string | null;
    valor?: string | null;
    valorRecebido?: string | null;
    formaPagamento?: string | null;
    dataFinalizada?: string | null;
    dataInicio?: string | null;
    plano?: string | null;
  } | null;
  comprador?: {
    nome?: string | null;
    email?: string | null;
    cpf_cnpj?: string | null;
    telefone?: string | null;
  } | null;
  produto?: {
    codigo?: string | null;
    nome?: string | null;
  } | null;
  assinatura?: {
    codigo?: string | null;
    status?: string | null;
    plano?: string | null;
    parcela?: string | null;
  } | null;
}

interface MonetizzeListResponse {
  dados?: MonetizzeVenda[];
  recordCount?: number;
  pageCount?: number;
  page?: number;
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

async function fetchMonetizzePage(url: string, apiKey: string): Promise<MonetizzeListResponse> {
  const res = await fetch(url, { headers: monetizzeAuthHeaders(apiKey) });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Monetizze API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<MonetizzeListResponse>;
}

async function fetchAllMonetizzeVendas(
  apiKey: string,
  job: Job,
  collected: { count: number },
): Promise<MonetizzeVenda[]> {
  const all: MonetizzeVenda[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${MONETIZZE_API_BASE}/vendas?page=${page}&rows=${PAGE_SIZE}`;
    const response = await fetchMonetizzePage(url, apiKey);
    const items = response.dados ?? [];
    if (items.length === 0) break;

    all.push(...items);
    collected.count += items.length;

    report(job, {
      phase: "fetching",
      current: collected.count,
      total: response.recordCount ?? 0,
      message: `${collected.count} vendas encontradas...`,
    });

    page++;
    if (response.pageCount !== undefined && page > response.pageCount) break;
    if (items.length < PAGE_SIZE) break;
  }

  return all;
}

export async function processMonetizzeSyncJob(job: Job<SyncJobData>): Promise<{
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

  const apiKey = decrypt(integration.accessToken);

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
    message: isReSync ? "Buscando atualizações da Monetizze..." : "Buscando vendas da Monetizze...",
  });

  const collected = { count: 0 };
  const allVendas = await fetchAllMonetizzeVendas(apiKey, job, collected);
  const totalItems = allVendas.length;

  if (!isReSync) {
    report(job, {
      phase: "deleting",
      current: 0,
      total: totalItems,
      message: "Limpando dados anteriores da Monetizze...",
    });
    await db
      .delete(events)
      .where(and(eq(events.organizationId, organizationId), eq(events.provider, "monetizze")));
    await db
      .delete(payments)
      .where(and(eq(payments.organizationId, organizationId), eq(payments.provider, "monetizze")));
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

  for (const venda of allVendas) {
    const statusNorm = mapMonetizzeStatus(venda.venda?.codigo_status ?? venda.venda?.status);
    if (statusNorm !== "paid") continue;

    const valorStr = venda.venda?.valor ?? "0";
    const grossCents = Math.round(parseFloat(valorStr) * 100);
    if (!grossCents) continue;

    const dateStr = venda.venda?.dataFinalizada ?? venda.venda?.dataInicio;
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

    const customerId = venda.comprador?.email?.toLowerCase() ?? venda.comprador?.cpf_cnpj ?? venda.venda?.codigo ?? "unknown";
    const acq = await caches.lookupAcquisition(organizationId, customerId);

    const subCode = venda.assinatura?.codigo;
    const recurring = !!subCode;
    const billingInterval: BillingInterval | null = recurring
      ? mapMonetizzeBillingInterval(venda.assinatura?.plano)
      : null;

    if (recurring && subCode && !seenSubIds.has(subCode)) {
      seenSubIds.add(subCode);
      const subBase = await caches.computeBaseValue(organizationId, "BRL", orgCurrency, grossCents);
      subRows.push({
        organizationId,
        subscriptionId: subCode,
        customerId,
        planId: venda.produto?.codigo ?? subCode,
        planName: venda.produto?.nome ?? subCode,
        status: mapMonetizzeSubscriptionStatus(venda.assinatura?.status),
        valueInCents: grossCents,
        currency: "BRL",
        baseCurrency: subBase.baseCurrency,
        exchangeRate: subBase.exchangeRate,
        baseValueInCents: subBase.baseValueInCents,
        billingInterval: billingInterval ?? "monthly",
        startedAt: paidAt,
      });
    }

    const netStr = venda.venda?.valorRecebido ?? valorStr;
    const netCents = Math.round(parseFloat(netStr) * 100);
    const base = await caches.computeBaseValue(organizationId, "BRL", orgCurrency, grossCents);

    const parcela = venda.assinatura?.parcela;
    const isRenewal = recurring && parcela ? parseInt(parcela, 10) > 1 : false;
    const eventType = isRenewal ? "renewal" : "purchase";
    const paymentMethod = mapMonetizzePaymentMethod(venda.venda?.formaPagamento);
    const eventHash = monetizzeEventHash(organizationId, String(venda.venda?.codigo));

    const sharedRow = {
      organizationId,
      eventType,
      grossValueInCents: grossCents,
      currency: "BRL",
      baseCurrency: base.baseCurrency,
      exchangeRate: base.exchangeRate,
      baseGrossValueInCents: base.baseValueInCents,
      baseNetValueInCents: Math.round(netCents * base.exchangeRate),
      billingType: recurring ? ("recurring" as const) : ("one_time" as const),
      billingReason: recurring ? "subscription_cycle" : null,
      billingInterval,
      subscriptionId: subCode ?? null,
      customerId,
      paymentMethod,
      provider: "monetizze",
      eventHash,
      createdAt: paidAt,
      productId: venda.produto?.codigo ?? null,
      productName: venda.produto?.nome ?? null,
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

    if (venda.comprador) {
      customerRows.push({
        organizationId,
        customerId,
        name: venda.comprador.nome ?? null,
        email: venda.comprador.email ?? null,
        phone: venda.comprador.telefone ?? null,
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
          AND e2.provider = 'monetizze'
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
          AND p2.provider = 'monetizze'
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
    ? `Sync concluído! ${skippedByLimit} vendas ignoradas por limite do plano.`
    : "Sync concluído!";
  report(job, { phase: "completed", current: totalItems, total: totalItems, message: completionMsg, reachedLimit });

  return { subscriptionsSynced: subRows.length, paymentsSynced, oneTimePurchasesSynced, reachedLimit, skippedByLimit };
}
