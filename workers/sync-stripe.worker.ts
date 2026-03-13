import Stripe from "stripe";
import type { Job } from "bullmq";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";
import { extractSubscriptionIdFromInvoice, extractPaymentIntentFromInvoice, mapBillingInterval, stripeEventHash } from "@/utils/stripe-helpers";
import { isOrgOverRevenueLimit } from "@/utils/check-revenue-limit";
import { SyncCaches } from "./shared/caches";
import { bulkUpsertPayments, bulkUpsertEvents, bulkUpsertSubscriptions, bulkUpsertCustomers } from "./shared/bulk-operations";
import type { SyncJobData, SyncJobProgress } from "@/lib/queue";
import type { BillingInterval } from "@/utils/billing";

function mapStripeStatus(
  s: Stripe.Subscription.Status,
): "active" | "canceled" | "past_due" | "trialing" {
  const map: Record<string, "active" | "canceled" | "past_due" | "trialing"> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
    unpaid: "past_due",
    incomplete: "past_due",
    incomplete_expired: "canceled",
    paused: "active",
  };
  return map[s] ?? "active";
}

function extractMetaCustomerId(metadata: Record<string, string> | null | undefined): string | null {
  if (!metadata) return null;
  return metadata.growthos_customer_id ?? metadata.groware_customer_id ?? null;
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

async function collectSubscriptions(stripe: Stripe, job: Job): Promise<Stripe.Subscription[]> {
  const all: Stripe.Subscription[] = [];
  for await (const sub of stripe.subscriptions.list({ limit: 100, status: "all" })) {
    all.push(sub);
    if (all.length % 100 === 0) {
      report(job, { phase: "fetching", current: all.length, total: 0, message: `${all.length} subscriptions...` });
    }
  }
  return all;
}

async function collectInvoices(stripe: Stripe, job: Job, since?: number): Promise<Stripe.Invoice[]> {
  const all: Stripe.Invoice[] = [];
  const params: Stripe.InvoiceListParams = {
    limit: 100,
    status: "paid",
    ...(since ? { created: { gte: since } } : {}),
  };
  for await (const inv of stripe.invoices.list(params)) {
    all.push(inv);
    if (all.length % 100 === 0) {
      report(job, { phase: "fetching", current: all.length, total: 0, message: `${all.length} invoices...` });
    }
  }
  return all;
}

async function collectInvoiceLinkedIds(stripe: Stripe, job: Job): Promise<Set<string>> {
  const ids = new Set<string>();
  let count = 0;
  for await (const ip of stripe.invoicePayments.list({ status: "paid" })) {
    const p = ip.payment;
    if (p.type === "payment_intent" && p.payment_intent) {
      const piId = typeof p.payment_intent === "string" ? p.payment_intent : p.payment_intent.id;
      ids.add(`pi:${piId}`);
    } else if (p.type === "charge" && p.charge) {
      const chId = typeof p.charge === "string" ? p.charge : p.charge.id;
      ids.add(`ch:${chId}`);
    }
    count++;
    if (count % 500 === 0) {
      report(job, { phase: "fetching", current: count, total: 0, message: `${count} invoice payments processados...` });
    }
  }
  return ids;
}

async function collectCharges(stripe: Stripe, job: Job, since?: number): Promise<Stripe.Charge[]> {
  const all: Stripe.Charge[] = [];
  const params: Stripe.ChargeListParams = {
    limit: 100,
    ...(since ? { created: { gte: since } } : {}),
  };
  for await (const ch of stripe.charges.list(params)) {
    if (ch.status !== "succeeded" || !ch.amount) continue;
    all.push(ch);
    if (all.length % 100 === 0) {
      report(job, { phase: "fetching", current: all.length, total: 0, message: `${all.length} charges...` });
    }
  }
  return all;
}

export async function processStripeSyncJob(job: Job<SyncJobData>): Promise<{
  subscriptionsSynced: number;
  invoicesSynced: number;
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

  const stripe = new Stripe(decrypt(integration.accessToken));
  const orgCurrency = await getOrgCurrency(organizationId);
  const caches = new SyncCaches();

  const isReSync = !!integration.historySyncedAt;
  const sinceTimestamp = isReSync
    ? Math.floor(integration.historySyncedAt!.getTime() / 1000) - 86400
    : undefined;

  report(job, {
    phase: "fetching",
    current: 0,
    total: 0,
    message: isReSync ? "Buscando atualizações do Stripe..." : "Buscando dados do Stripe...",
  });

  const [allSubs, allInvoices, invoiceLinkedIds, rawCharges] = await Promise.all([
    collectSubscriptions(stripe, job),
    collectInvoices(stripe, job, sinceTimestamp),
    collectInvoiceLinkedIds(stripe, job),
    collectCharges(stripe, job, sinceTimestamp),
  ]);

  const allCharges = rawCharges.filter((ch) => {
    const piId = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id ?? null;
    return !(piId && invoiceLinkedIds.has(`pi:${piId}`)) && !invoiceLinkedIds.has(`ch:${ch.id}`);
  });

  const totalItems = allSubs.length + allInvoices.length + allCharges.length;

  if (!isReSync) {
    report(job, {
      phase: "deleting",
      current: 0,
      total: totalItems,
      message: "Limpando dados anteriores do Stripe...",
    });
    await db.delete(events).where(and(eq(events.organizationId, organizationId), eq(events.provider, "stripe")));
    await db.delete(payments).where(and(eq(payments.organizationId, organizationId), eq(payments.provider, "stripe")));
  }

  await caches.preloadAcquisitions(organizationId);

  let processed = 0;
  const subIntervalMap = new Map<string, BillingInterval>();

  report(job, { phase: "processing", current: 0, total: totalItems, message: "Processando subscriptions..." });

  const subRows: (typeof subscriptions.$inferInsert)[] = [];
  for (const sub of allSubs) {
    const rawCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const metaCustomerId = extractMetaCustomerId(sub.metadata as Record<string, string> | null);
    const customerId = metaCustomerId ?? rawCustomerId;

    const item = sub.items.data[0];
    const interval = item?.price.recurring?.interval ?? "month";
    const intervalCount = item?.price.recurring?.interval_count ?? 1;
    const billingInterval = mapBillingInterval(interval, intervalCount);
    subIntervalMap.set(sub.id, billingInterval);

    const eventCurrency = sub.currency.toUpperCase();
    const valueInCents = item?.price.unit_amount ?? 0;
    const { baseCurrency, exchangeRate, baseValueInCents } = await caches.computeBaseValue(
      organizationId, eventCurrency, orgCurrency, valueInCents,
    );

    subRows.push({
      organizationId,
      subscriptionId: sub.id,
      customerId,
      planId: item?.price.id ?? "unknown",
      planName: item?.price.nickname ?? item?.price.id ?? "Plano",
      status: mapStripeStatus(sub.status),
      valueInCents,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseValueInCents,
      billingInterval,
      startedAt: new Date(sub.start_date * 1000),
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    });
  }

  await bulkUpsertSubscriptions(subRows);
  processed += allSubs.length;
  report(job, { phase: "processing", current: processed, total: totalItems, message: "Processando invoices..." });

  const eventRows: (typeof events.$inferInsert)[] = [];
  const paymentRows: (typeof payments.$inferInsert)[] = [];
  const customerRows: { organizationId: string; customerId: string; name: string | null; email: string | null; phone: string | null; eventTimestamp: Date }[] = [];

  let invoicesSynced = 0;
  let oneTimePurchasesSynced = 0;

  for (const invoice of allInvoices) {
    if (!invoice.amount_paid) continue;

    const rawCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
    const metaCustomerId = extractMetaCustomerId(invoice.metadata as Record<string, string> | null);
    const customerId = metaCustomerId ?? rawCustomerId;

    const acq = customerId ? await caches.lookupAcquisition(organizationId, customerId) : null;

    const subscriptionId = extractSubscriptionIdFromInvoice(invoice);
    const isRecurring = !!subscriptionId;
    const billingInterval = isRecurring ? (subIntervalMap.get(subscriptionId!) ?? "monthly") : undefined;
    const billingReason = invoice.billing_reason ?? null;
    const eventType = isRecurring && billingReason !== "subscription_create" ? "renewal" : "purchase";
    const paidAt = invoice.status_transitions?.paid_at ?? invoice.created;

    const eventCurrency = invoice.currency.toUpperCase();
    const { baseCurrency, exchangeRate, baseValueInCents } = await caches.computeBaseValue(
      organizationId, eventCurrency, orgCurrency, invoice.amount_paid,
    );

    const invoicePiId = extractPaymentIntentFromInvoice(invoice);
    const eventHash = stripeEventHash(organizationId, invoicePiId ?? invoice.id);

    eventRows.push({
      organizationId,
      eventType,
      grossValueInCents: invoice.amount_paid,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents: baseValueInCents,
      billingType: isRecurring ? "recurring" : "one_time",
      billingReason,
      billingInterval: (billingInterval as BillingInterval | undefined) ?? null,
      subscriptionId,
      customerId: customerId || undefined,
      paymentMethod: "credit_card",
      provider: "stripe",
      eventHash,
      createdAt: new Date(paidAt * 1000),
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
      grossValueInCents: invoice.amount_paid,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents: baseValueInCents,
      billingType: isRecurring ? "recurring" : "one_time",
      billingReason,
      billingInterval: (billingInterval as BillingInterval | undefined) ?? null,
      subscriptionId,
      customerId: customerId || undefined,
      paymentMethod: "credit_card",
      provider: "stripe",
      eventHash,
      createdAt: new Date(paidAt * 1000),
      source: acq?.source ?? null,
      medium: acq?.medium ?? null,
      campaign: acq?.campaign ?? null,
      content: acq?.content ?? null,
      landingPage: acq?.landingPage ?? null,
      entryPage: acq?.entryPage ?? null,
      sessionId: acq?.sessionId ?? null,
    });

    if (customerId) {
      customerRows.push({
        organizationId,
        customerId,
        name: invoice.customer_name ?? null,
        email: invoice.customer_email ?? null,
        phone: null,
        eventTimestamp: new Date(paidAt * 1000),
      });
    }

    if (isRecurring) invoicesSynced++;
    else oneTimePurchasesSynced++;
  }

  processed += allInvoices.length;
  report(job, { phase: "processing", current: processed, total: totalItems, message: "Processando charges..." });

  for (const charge of allCharges) {
    const rawCustomerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id ?? null;
    const metaCustomerId = extractMetaCustomerId(charge.metadata as Record<string, string> | null);
    const customerId = metaCustomerId ?? rawCustomerId;

    const acq = customerId ? await caches.lookupAcquisition(organizationId, customerId) : null;
    const pm = charge.payment_method_details?.type ?? "credit_card";
    const eventCurrency = charge.currency.toUpperCase();
    const { baseCurrency, exchangeRate, baseValueInCents } = await caches.computeBaseValue(
      organizationId, eventCurrency, orgCurrency, charge.amount,
    );

    const eventHash = stripeEventHash(organizationId, charge.id);

    eventRows.push({
      organizationId,
      eventType: "purchase",
      grossValueInCents: charge.amount,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents: baseValueInCents,
      billingType: "one_time",
      billingReason: null,
      billingInterval: null,
      subscriptionId: null,
      customerId: customerId ?? undefined,
      paymentMethod: pm,
      provider: "stripe",
      eventHash,
      createdAt: new Date(charge.created * 1000),
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
      eventType: "purchase",
      grossValueInCents: charge.amount,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents: baseValueInCents,
      billingType: "one_time",
      billingReason: null,
      billingInterval: null,
      subscriptionId: null,
      customerId: customerId ?? undefined,
      paymentMethod: pm,
      provider: "stripe",
      eventHash,
      createdAt: new Date(charge.created * 1000),
      source: acq?.source ?? null,
      medium: acq?.medium ?? null,
      campaign: acq?.campaign ?? null,
      content: acq?.content ?? null,
      landingPage: acq?.landingPage ?? null,
      entryPage: acq?.entryPage ?? null,
      sessionId: acq?.sessionId ?? null,
    });

    if (customerId) {
      customerRows.push({
        organizationId,
        customerId,
        name: charge.billing_details?.name ?? null,
        email: charge.billing_details?.email ?? null,
        phone: charge.billing_details?.phone ?? null,
        eventTimestamp: new Date(charge.created * 1000),
      });
    }

    oneTimePurchasesSynced++;
  }

  processed += allCharges.length;
  report(job, { phase: "processing", current: processed, total: totalItems, message: "Inserindo dados no banco..." });

  await bulkUpsertEvents(eventRows);
  await bulkUpsertPayments(paymentRows);
  await bulkUpsertCustomers(customerRows);

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

  report(job, { phase: "completed", current: totalItems, total: totalItems, message: "Sync concluído!" });

  return {
    subscriptionsSynced: allSubs.length,
    invoicesSynced,
    oneTimePurchasesSynced,
  };
}
