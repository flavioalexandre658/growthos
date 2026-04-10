import { db } from "@/db";
import { events, subscriptions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  kirvanoEventHash,
  parseKirvanoAmount,
  mapKirvanoStatus,
  mapKirvanoSubscriptionStatus,
  mapKirvanoBillingInterval,
  mapKirvanoPaymentMethod,
} from "@/utils/kirvano-helpers";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { checkMilestones } from "@/utils/milestones";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { createNotification } from "@/utils/create-notification";
import type { BillingInterval } from "@/utils/billing";

export interface KirvanoWebhookBody {
  event?: string;
  status?: string;
  sale_id?: string;
  checkout_id?: string;
  type?: string;
  amount?: string | number;
  payment_method?: string;
  customer?: { name?: string; document?: string; email?: string; phone_number?: string } | null;
  products?: Array<{ id?: string; name?: string; price?: string | number }> | null;
  subscription?: { id?: string; status?: string } | null;
  utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string } | null;
  created_at?: string;
}

function pickCustomerId(body: KirvanoWebhookBody): string {
  if (body.customer?.email) return body.customer.email.toLowerCase();
  if (body.customer?.document) return body.customer.document;
  return body.sale_id ?? "unknown";
}

function pickGrossInCents(body: KirvanoWebhookBody): number {
  return parseKirvanoAmount(body.amount);
}

function pickEventDate(body: KirvanoWebhookBody): Date {
  if (body.created_at) return new Date(body.created_at);
  return new Date();
}

function pickProductInfo(body: KirvanoWebhookBody): { id: string | null; name: string | null } {
  const first = body.products?.[0];
  return {
    id: first?.id ?? null,
    name: first?.name ?? null,
  };
}

async function getOrgCurrency(orgId: string): Promise<string> {
  const [org] = await db
    .select({ currency: organizations.currency })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org?.currency ?? "BRL";
}

async function computeBaseValue(
  orgId: string,
  orgCurrency: string,
  grossValueInCents: number,
): Promise<{ baseCurrency: string; exchangeRate: number; baseGrossValueInCents: number }> {
  const rate = await resolveExchangeRate(orgId, "BRL", orgCurrency);
  const resolvedRate = rate ?? 1;
  return {
    baseCurrency: orgCurrency,
    exchangeRate: resolvedRate,
    baseGrossValueInCents: Math.round(grossValueInCents * resolvedRate),
  };
}

export async function handleKirvanoEvent(orgId: string, body: KirvanoWebhookBody): Promise<void> {
  const statusKey = (body.status ?? body.event ?? "").toUpperCase();
  const normalized = mapKirvanoStatus(statusKey);
  let shouldCheckMilestones = false;

  if (normalized === "paid") {
    const isRecurring = (body.type ?? "").toUpperCase() === "RECURRING";
    const isRenewal = isRecurring && !!body.subscription?.id;
    if (isRenewal) {
      await handleKirvanoPurchase(orgId, body, true);
    } else {
      await handleKirvanoPurchase(orgId, body, false);
    }
    shouldCheckMilestones = true;
  } else if (normalized === "refunded" || statusKey === "SALE_CHARGEBACK" || statusKey === "CHARGEBACK") {
    await handleKirvanoRefund(orgId, body);
  } else if (normalized === "past_due" && body.subscription?.id) {
    await handleKirvanoSubscriptionPastDue(orgId, body);
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => console.error("[milestone-check]", err));
  }
}

async function handleKirvanoPurchase(orgId: string, body: KirvanoWebhookBody, isRenewal: boolean): Promise<void> {
  const saleId = body.sale_id ?? "";
  if (!saleId) return;
  const grossValueInCents = pickGrossInCents(body);
  if (!grossValueInCents) return;

  const customerId = pickCustomerId(body);
  const acq = await lookupAcquisitionContext(orgId, customerId);
  const recurring = (body.type ?? "").toUpperCase() === "RECURRING";
  const product = pickProductInfo(body);

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );

  const billingInterval: BillingInterval | null = recurring ? "monthly" : null;
  const billingReason = recurring ? "subscription_cycle" : null;
  const eventType = isRenewal ? "renewal" : "purchase";
  const paymentMethod = mapKirvanoPaymentMethod(body.payment_method ?? null);
  const paidAt = pickEventDate(body);
  const eventHash = kirvanoEventHash(orgId, saleId);

  const sharedCols = {
    organizationId: orgId,
    eventType,
    grossValueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    baseNetValueInCents: baseGrossValueInCents,
    billingType: recurring ? ("recurring" as const) : ("one_time" as const),
    billingReason,
    billingInterval,
    subscriptionId: body.subscription?.id ?? null,
    customerId,
    paymentMethod,
    provider: "kirvano",
    eventHash,
    createdAt: paidAt,
    productId: product.id,
    productName: product.name,
    source: body.utm?.source ?? acq?.source ?? null,
    medium: body.utm?.medium ?? acq?.medium ?? null,
    campaign: body.utm?.campaign ?? acq?.campaign ?? null,
    content: body.utm?.content ?? acq?.content ?? null,
    landingPage: acq?.landingPage ?? null,
    entryPage: acq?.entryPage ?? null,
    sessionId: acq?.sessionId ?? null,
  };

  await db
    .insert(events)
    .values(sharedCols)
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        eventType,
        billingType: recurring ? "recurring" : "one_time",
        billingReason,
        billingInterval,
        subscriptionId: body.subscription?.id ?? null,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        baseNetValueInCents: baseGrossValueInCents,
        createdAt: paidAt,
      },
    });

  await insertPayment(sharedCols).catch((err) => {
    console.error("[kirvano-webhook] insertPayment failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (recurring && body.subscription?.id) {
    await db
      .insert(subscriptions)
      .values({
        organizationId: orgId,
        subscriptionId: body.subscription.id,
        customerId,
        planId: product.id ?? body.subscription.id,
        planName: product.name ?? body.subscription.id,
        status: "active",
        valueInCents: grossValueInCents,
        currency: "BRL",
        baseCurrency,
        exchangeRate,
        baseValueInCents: baseGrossValueInCents,
        billingInterval: billingInterval ?? "monthly",
        startedAt: paidAt,
      })
      .onConflictDoUpdate({
        target: [subscriptions.subscriptionId],
        set: {
          status: "active",
          baseCurrency,
          exchangeRate,
          baseValueInCents: baseGrossValueInCents,
          updatedAt: new Date(),
        },
      });
  }

  if (body.customer) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: body.customer.name ?? null,
      email: body.customer.email ?? null,
      phone: body.customer.phone_number ?? null,
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[kirvano-webhook] upsertCustomer failed", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  const valueLabel = grossValueInCents
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(grossValueInCents / 100)
    : null;
  createNotification({
    organizationId: orgId,
    type: recurring ? "renewal" : "purchase",
    title: "Cliente",
    body: valueLabel ?? undefined,
    metadata: {
      customerId,
      customerName: body.customer?.name ?? null,
      valueInCents: grossValueInCents,
      currency: "BRL",
    },
  }).catch(() => {});
}

async function handleKirvanoRefund(orgId: string, body: KirvanoWebhookBody): Promise<void> {
  const saleId = body.sale_id ?? "";
  if (!saleId) return;
  const grossValueInCents = pickGrossInCents(body);
  if (!grossValueInCents) return;

  const customerId = pickCustomerId(body);
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );
  const eventHash = kirvanoEventHash(orgId, `refund:${saleId}`);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "refund",
      grossValueInCents: -grossValueInCents,
      currency: "BRL",
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents: -baseGrossValueInCents,
      billingType: "one_time",
      customerId,
      provider: "kirvano",
      eventHash,
      metadata: { saleId },
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        grossValueInCents: -grossValueInCents,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents: -baseGrossValueInCents,
      },
    });

  await insertPayment({
    organizationId: orgId,
    eventType: "refund",
    grossValueInCents: -grossValueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents: -baseGrossValueInCents,
    billingType: "one_time",
    customerId,
    provider: "kirvano",
    eventHash,
    metadata: { saleId },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[kirvano-webhook] insertPayment refund failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function handleKirvanoSubscriptionPastDue(orgId: string, body: KirvanoWebhookBody): Promise<void> {
  const subId = body.subscription?.id;
  if (!subId) return;
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subId));
}
