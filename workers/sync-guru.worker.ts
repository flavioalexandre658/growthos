import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and, sql } from "drizzle-orm";
import {
  GURU_API_BASE,
  guruAuthHeaders,
  guruEventHash,
  mapGuruTransactionStatus,
  mapGuruSubscriptionStatus,
  mapGuruBillingInterval,
  mapGuruPaymentMethod,
} from "@/utils/guru-helpers";
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

interface GuruTransaction {
  id?: string | number;
  status?: string;
  dates?: { created_at?: string; confirmed_at?: string };
  contact?: { id?: string; name?: string; email?: string; doc?: string; phone_number?: string };
  product?: { id?: string; name?: string; type?: string; unit_value?: number; total_value?: number };
  payment?: { gross?: number; total?: number; net?: number; method?: string; installments?: number };
  subscription?: { id?: string; name?: string; last_status?: string; charged_every_days?: number; charged_times?: number };
}

interface GuruListResponse {
  data?: GuruTransaction[];
  links?: { next?: string | null };
  meta?: { current_page?: number; last_page?: number; total?: number };
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

async function fetchGuruPage(url: string, userToken: string): Promise<GuruListResponse> {
  const res = await fetch(url, { headers: guruAuthHeaders(userToken) });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Guru API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<GuruListResponse>;
}

async function fetchAllGuruTransactions(
  userToken: string,
  job: Job,
  collected: { count: number },
): Promise<GuruTransaction[]> {
  const all: GuruTransaction[] = [];
  let url: string | null = `${GURU_API_BASE}/transactions?page_size=${PAGE_SIZE}`;

  while (url) {
    const page = await fetchGuruPage(url, userToken);
    const items = page.data ?? [];
    if (items.length === 0) break;

    all.push(...items);
    collected.count += items.length;

    report(job, {
      phase: "fetching",
      current: collected.count,
      total: page.meta?.total ?? 0,
      message: `${collected.count} transações encontradas...`,
    });

    url = page.links?.next ?? null;
    if (page.meta?.current_page && page.meta?.last_page && page.meta.current_page >= page.meta.last_page) break;
  }

  return all;
}

export async function processGuruSyncJob(job: Job<SyncJobData>): Promise<{
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

  const userToken = decrypt(integration.accessToken);

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
    message: isReSync ? "Buscando atualizações da Guru..." : "Buscando transações da Guru...",
  });

  const collected = { count: 0 };
  const allTransactions = await fetchAllGuruTransactions(userToken, job, collected);
  const totalItems = allTransactions.length;

  if (!isReSync) {
    report(job, {
      phase: "deleting",
      current: 0,
      total: totalItems,
      message: "Limpando dados anteriores da Guru...",
    });
    await db
      .delete(events)
      .where(and(eq(events.organizationId, organizationId), eq(events.provider, "guru")));
    await db
      .delete(payments)
      .where(and(eq(payments.organizationId, organizationId), eq(payments.provider, "guru")));
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
  const seenSubIds = new Set<string>();

  let paymentsSynced = 0;
  let oneTimePurchasesSynced = 0;

  for (const tx of allTransactions) {
    const statusNorm = mapGuruTransactionStatus(tx.status);
    if (statusNorm !== "paid") continue;

    const grossCents = Math.round((tx.payment?.gross ?? tx.payment?.total ?? tx.product?.total_value ?? 0) * 100);
    if (!grossCents) continue;

    const paidAt = tx.dates?.confirmed_at ? new Date(tx.dates.confirmed_at) : tx.dates?.created_at ? new Date(tx.dates.created_at) : new Date();

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

    const customerId = tx.contact?.email?.toLowerCase() ?? tx.contact?.id ?? String(tx.id ?? "unknown");
    const acq = await caches.lookupAcquisition(organizationId, customerId);
    const recurring = !!tx.subscription || tx.product?.type === "plan";
    const billingInterval: BillingInterval | null = recurring
      ? mapGuruBillingInterval(tx.subscription?.charged_every_days ?? null)
      : null;

    if (recurring && tx.subscription?.id && !seenSubIds.has(tx.subscription.id)) {
      seenSubIds.add(tx.subscription.id);
      const subBase = await caches.computeBaseValue(organizationId, "BRL", orgCurrency, grossCents);
      subRows.push({
        organizationId,
        subscriptionId: tx.subscription.id,
        customerId,
        planId: tx.product?.id ?? tx.subscription.id,
        planName: tx.subscription.name ?? tx.product?.name ?? tx.subscription.id,
        status: mapGuruSubscriptionStatus(tx.subscription.last_status),
        valueInCents: grossCents,
        currency: "BRL",
        baseCurrency: subBase.baseCurrency,
        exchangeRate: subBase.exchangeRate,
        baseValueInCents: subBase.baseValueInCents,
        billingInterval: billingInterval ?? "monthly",
        startedAt: paidAt,
      });
    }

    const netCents = tx.payment?.net ? Math.round(tx.payment.net * 100) : grossCents;
    const base = await caches.computeBaseValue(organizationId, "BRL", orgCurrency, grossCents);
    const isRenewal = recurring && (tx.subscription?.charged_times ?? 0) > 1;
    const eventType = isRenewal ? "renewal" : "purchase";
    const paymentMethod = mapGuruPaymentMethod(tx.payment?.method ?? null);
    const eventHash = guruEventHash(organizationId, String(tx.id));

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
      subscriptionId: tx.subscription?.id ?? null,
      customerId,
      paymentMethod,
      provider: "guru",
      eventHash,
      createdAt: paidAt,
      productId: tx.product?.id ?? null,
      productName: tx.product?.name ?? null,
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

    if (tx.contact) {
      customerRows.push({
        organizationId,
        customerId,
        name: tx.contact.name ?? null,
        email: tx.contact.email ?? null,
        phone: tx.contact.phone_number ?? null,
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
          AND e2.provider = 'guru'
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
          AND p2.provider = 'guru'
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
      syncError: totalItems === 0 && !isReSync ? "Nenhuma venda encontrada na API Guru." : null,
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
