import { db } from "@/db";
import { events, subscriptions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  eduzzEventHash,
  mapEduzzTransactionStatus,
  mapEduzzSubscriptionStatus,
  mapEduzzBillingInterval,
  mapEduzzPaymentMethod,
} from "@/utils/eduzz-helpers";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { checkMilestones } from "@/utils/milestones";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { createNotification } from "@/utils/create-notification";
import type { BillingInterval } from "@/utils/billing";

export interface EduzzWebhookBody {
  id?: string | number;
  event?: string;
  trans_cod?: string | number;
  trans_status?: number | string;
  trans_value?: number;
  trans_paid?: number;
  trans_currency?: string;
  trans_createdate?: string;
  trans_paiddate?: string;
  cus_email?: string;
  cus_name?: string;
  cus_taxnumber?: string;
  cus_tel?: string;
  product_cod?: string | number;
  product_name?: string;
  recurrence_cod?: string | number;
  recurrence_status?: number | string;
  recurrence_interval?: number;
  recurrence_interval_type?: string;
  recurrence_plan?: string;
  payment_method?: string;
  data?: Record<string, unknown>;
}

function pickCustomerId(body: EduzzWebhookBody): string {
  if (body.cus_email) return body.cus_email.toLowerCase();
  if (body.cus_taxnumber) return body.cus_taxnumber;
  if (body.trans_cod) return String(body.trans_cod);
  return "unknown";
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
  eventCurrency: string,
  orgCurrency: string,
  grossValueInCents: number,
): Promise<{ baseCurrency: string; exchangeRate: number; baseGrossValueInCents: number }> {
  const rate = await resolveExchangeRate(orgId, eventCurrency, orgCurrency);
  const resolvedRate = rate ?? 1;
  return {
    baseCurrency: orgCurrency,
    exchangeRate: resolvedRate,
    baseGrossValueInCents: Math.round(grossValueInCents * resolvedRate),
  };
}

function resolveEduzzEvent(body: EduzzWebhookBody): string {
  if (body.event) return body.event.toLowerCase();
  const status = mapEduzzTransactionStatus(body.trans_status);
  if (status === "paid") return "invoice_paid";
  if (status === "refunded") return "invoice_refunded";
  if (status === "past_due") return "invoice_canceled";
  return "unknown";
}

export async function handleEduzzEvent(
  orgId: string,
  body: EduzzWebhookBody,
): Promise<void> {
  const eventName = resolveEduzzEvent(body);
  let shouldCheckMilestones = false;

  switch (eventName) {
    case "invoice_paid":
      await handleEduzzPurchase(orgId, body);
      shouldCheckMilestones = true;
      break;
    case "invoice_refunded":
      await handleEduzzRefund(orgId, body);
      break;
    case "invoice_canceled":
      await handleEduzzPastDue(orgId, body);
      break;
    case "contract_canceled":
      await handleEduzzSubscriptionCanceled(orgId, body);
      break;
    case "contract_suspended":
    case "contract_overdue":
      await handleEduzzSubscriptionPastDue(orgId, body);
      break;
    default: {
      const status = mapEduzzTransactionStatus(body.trans_status);
      if (status === "paid") {
        await handleEduzzPurchase(orgId, body);
        shouldCheckMilestones = true;
      } else if (status === "refunded") {
        await handleEduzzRefund(orgId, body);
      }
      break;
    }
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => console.error("[milestone-check]", err));
  }
}

async function handleEduzzPurchase(orgId: string, body: EduzzWebhookBody): Promise<void> {
  const transCod = String(body.trans_cod ?? "");
  if (!transCod) return;

  const grossValueInCents = Math.round((body.trans_value ?? 0) * 100);
  if (!grossValueInCents) return;

  const eventCurrency = (body.trans_currency ?? "BRL").toUpperCase();
  const customerId = pickCustomerId(body);
  const acq = await lookupAcquisitionContext(orgId, customerId, {
    email: body.cus_email ?? null,
  });

  const recurring = !!body.recurrence_cod;
  const subscriptionId = recurring ? String(body.recurrence_cod) : null;

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );

  const billingInterval: BillingInterval | null = recurring
    ? mapEduzzBillingInterval(body.recurrence_interval_type, body.recurrence_interval)
    : null;

  const billingReason = recurring ? "subscription_cycle" : null;
  const eventType = "purchase";
  const paymentMethod = mapEduzzPaymentMethod(body.payment_method);
  const paidAt = body.trans_paiddate
    ? new Date(body.trans_paiddate)
    : body.trans_createdate
      ? new Date(body.trans_createdate)
      : new Date();
  const eventHash = eduzzEventHash(orgId, transCod);

  const sharedCols = {
    organizationId: orgId,
    eventType,
    grossValueInCents,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    baseNetValueInCents: baseGrossValueInCents,
    billingType: recurring ? ("recurring" as const) : ("one_time" as const),
    billingReason,
    billingInterval,
    subscriptionId,
    customerId,
    paymentMethod,
    provider: "eduzz",
    eventHash,
    createdAt: paidAt,
    productId: body.product_cod ? String(body.product_cod) : null,
    productName: body.product_name ?? null,
    source: acq?.source ?? null,
    medium: acq?.medium ?? null,
    campaign: acq?.campaign ?? null,
    content: acq?.content ?? null,
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
        subscriptionId,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        baseNetValueInCents: baseGrossValueInCents,
        createdAt: paidAt,
      },
    });

  await insertPayment(sharedCols).catch((err) => {
    console.error("[eduzz-webhook] insertPayment failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (recurring && subscriptionId) {
    await db
      .insert(subscriptions)
      .values({
        organizationId: orgId,
        subscriptionId,
        customerId,
        planId: body.product_cod ? String(body.product_cod) : subscriptionId,
        planName: body.recurrence_plan ?? body.product_name ?? subscriptionId,
        status: "active",
        valueInCents: grossValueInCents,
        currency: eventCurrency,
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

  if (body.cus_email || body.cus_name) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: body.cus_name ?? null,
      email: body.cus_email ?? null,
      phone: body.cus_tel ?? null,
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[eduzz-webhook] upsertCustomer failed", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  const valueLabel = grossValueInCents
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: eventCurrency,
      }).format(grossValueInCents / 100)
    : null;
  createNotification({
    organizationId: orgId,
    type: recurring ? "renewal" : "purchase",
    title: "Cliente",
    body: valueLabel ?? undefined,
    metadata: {
      customerId,
      customerName: body.cus_name ?? null,
      valueInCents: grossValueInCents,
      currency: eventCurrency,
    },
  }).catch(() => {});
}

async function handleEduzzRefund(orgId: string, body: EduzzWebhookBody): Promise<void> {
  const transCod = String(body.trans_cod ?? "");
  if (!transCod) return;

  const grossValueInCents = Math.round((body.trans_value ?? 0) * 100);
  if (!grossValueInCents) return;

  const eventCurrency = (body.trans_currency ?? "BRL").toUpperCase();
  const customerId = pickCustomerId(body);

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );
  const eventHash = eduzzEventHash(orgId, `refund:${transCod}`);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "refund",
      grossValueInCents: -grossValueInCents,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents: -baseGrossValueInCents,
      billingType: "one_time",
      customerId,
      provider: "eduzz",
      eventHash,
      metadata: { transCod },
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        grossValueInCents: -grossValueInCents,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents: -baseGrossValueInCents,
      },
    });

  await insertPayment({
    organizationId: orgId,
    eventType: "refund",
    grossValueInCents: -grossValueInCents,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents: -baseGrossValueInCents,
    billingType: "one_time",
    customerId,
    provider: "eduzz",
    eventHash,
    metadata: { transCod },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[eduzz-webhook] insertPayment refund failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function handleEduzzPastDue(orgId: string, body: EduzzWebhookBody): Promise<void> {
  const subId = body.recurrence_cod ? String(body.recurrence_cod) : null;
  if (!subId) return;
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subId));
}

async function handleEduzzSubscriptionCanceled(orgId: string, body: EduzzWebhookBody): Promise<void> {
  const subId = body.recurrence_cod ? String(body.recurrence_cod) : null;
  if (!subId) return;

  const customerId = pickCustomerId(body);
  const grossValueInCents = Math.round((body.trans_value ?? 0) * 100);
  const eventCurrency = (body.trans_currency ?? "BRL").toUpperCase();
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );
  const billingInterval: BillingInterval = mapEduzzBillingInterval(
    body.recurrence_interval_type,
    body.recurrence_interval,
  );
  const eventHash = eduzzEventHash(orgId, `sub_canceled:${subId}`);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "subscription_canceled",
      grossValueInCents,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: "recurring",
      billingInterval,
      subscriptionId: subId,
      customerId,
      provider: "eduzz",
      eventHash,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await insertPayment({
    organizationId: orgId,
    eventType: "subscription_canceled",
    grossValueInCents,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: "recurring",
    billingInterval,
    subscriptionId: subId,
    customerId,
    provider: "eduzz",
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[eduzz-webhook] insertPayment cancel failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  await db
    .update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subId));
}

async function handleEduzzSubscriptionPastDue(orgId: string, body: EduzzWebhookBody): Promise<void> {
  const subId = body.recurrence_cod ? String(body.recurrence_cod) : null;
  if (!subId) return;
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subId));
}
