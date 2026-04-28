import { db } from "@/db";
import { events, subscriptions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  paypalEventHash,
  parsePayPalAmount,
  mapPayPalBillingInterval,
  mapPayPalPaymentMethod,
} from "@/utils/paypal-helpers";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { checkMilestones } from "@/utils/milestones";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { createNotification } from "@/utils/create-notification";
import type { BillingInterval } from "@/utils/billing";

export interface PayPalWebhookBody {
  id?: string;
  event_type?: string;
  resource?: Record<string, unknown>;
  resource_type?: string;
  summary?: string;
}

function pickCustomerId(resource: Record<string, unknown>): string {
  const payer = resource.payer as Record<string, unknown> | undefined;
  if (payer?.email_address) return String(payer.email_address).toLowerCase();
  const subscriber = resource.subscriber as Record<string, unknown> | undefined;
  if (subscriber?.email_address) return String(subscriber.email_address).toLowerCase();
  if (resource.id) return String(resource.id);
  return "unknown";
}

function pickCustomerName(resource: Record<string, unknown>): string | null {
  const payer = resource.payer as Record<string, unknown> | undefined;
  const name = payer?.name as Record<string, unknown> | undefined;
  if (name) {
    const parts = [name.given_name, name.surname].filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  const subscriber = resource.subscriber as Record<string, unknown> | undefined;
  const subName = subscriber?.name as Record<string, unknown> | undefined;
  if (subName) {
    const parts = [subName.given_name, subName.surname].filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  return null;
}

function pickCustomerEmail(resource: Record<string, unknown>): string | null {
  const payer = resource.payer as Record<string, unknown> | undefined;
  if (payer?.email_address) return String(payer.email_address).toLowerCase();
  const subscriber = resource.subscriber as Record<string, unknown> | undefined;
  if (subscriber?.email_address) return String(subscriber.email_address).toLowerCase();
  return null;
}

async function getOrgCurrency(orgId: string): Promise<string> {
  const [org] = await db
    .select({ currency: organizations.currency })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org?.currency ?? "USD";
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

export async function handlePayPalEvent(
  orgId: string,
  body: PayPalWebhookBody,
  accessToken: string,
): Promise<void> {
  const eventType = body.event_type ?? "";
  let shouldCheckMilestones = false;

  switch (eventType) {
    case "PAYMENT.CAPTURE.COMPLETED":
      await handlePayPalPayment(orgId, body);
      shouldCheckMilestones = true;
      break;
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REVERSED":
      await handlePayPalRefund(orgId, body);
      break;
    case "BILLING.SUBSCRIPTION.ACTIVATED":
      await handlePayPalSubscriptionCreated(orgId, body);
      break;
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED":
      await handlePayPalSubscriptionCanceled(orgId, body);
      break;
    case "BILLING.SUBSCRIPTION.SUSPENDED":
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
      await handlePayPalSubscriptionPastDue(orgId, body);
      break;
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => console.error("[milestone-check]", err));
  }
}

async function handlePayPalPayment(orgId: string, body: PayPalWebhookBody): Promise<void> {
  const resource = body.resource ?? {};
  const resourceId = String(resource.id ?? "");
  if (!resourceId) return;

  const amount = parsePayPalAmount(resource.amount as { value?: string; currency_code?: string } | undefined);
  if (!amount.cents) return;

  const grossValueInCents = amount.cents;
  const eventCurrency = amount.currency;
  const customerId = pickCustomerId(resource);
  const acq = await lookupAcquisitionContext(orgId, customerId, {
    email: pickCustomerEmail(resource),
  });

  const subscriptionId = resource.billing_agreement_id
    ? String(resource.billing_agreement_id)
    : null;
  const recurring = !!subscriptionId;

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );

  const billingInterval: BillingInterval | null = recurring ? "monthly" : null;
  const billingReason = recurring ? "subscription_cycle" : null;
  const eventType = "purchase";
  const paymentMethod = mapPayPalPaymentMethod("paypal");
  const paidAt = resource.create_time ? new Date(String(resource.create_time)) : new Date();
  const eventHash = paypalEventHash(orgId, resourceId);

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
    provider: "paypal",
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
    console.error("[paypal-webhook] insertPayment failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (recurring && subscriptionId) {
    await db
      .update(subscriptions)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(subscriptions.subscriptionId, subscriptionId));
  }

  const customerName = pickCustomerName(resource);
  const customerEmail = pickCustomerEmail(resource);

  if (customerEmail || customerName) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: customerName,
      email: customerEmail,
      phone: null,
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[paypal-webhook] upsertCustomer failed", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  const valueLabel = grossValueInCents
    ? new Intl.NumberFormat("en-US", {
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
      customerName,
      valueInCents: grossValueInCents,
      currency: eventCurrency,
    },
  }).catch(() => {});
}

async function handlePayPalRefund(orgId: string, body: PayPalWebhookBody): Promise<void> {
  const resource = body.resource ?? {};
  const resourceId = String(resource.id ?? "");
  if (!resourceId) return;

  const amount = parsePayPalAmount(resource.amount as { value?: string; currency_code?: string } | undefined);
  if (!amount.cents) return;

  const grossValueInCents = amount.cents;
  const eventCurrency = amount.currency;
  const customerId = pickCustomerId(resource);

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );
  const eventHash = paypalEventHash(orgId, `refund:${resourceId}`);

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
      provider: "paypal",
      eventHash,
      metadata: { resourceId },
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
    provider: "paypal",
    eventHash,
    metadata: { resourceId },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[paypal-webhook] insertPayment refund failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function handlePayPalSubscriptionCreated(orgId: string, body: PayPalWebhookBody): Promise<void> {
  const resource = body.resource ?? {};
  const subId = String(resource.id ?? "");
  if (!subId) return;

  const customerId = pickCustomerId(resource);
  const billingInfo = resource.billing_info as Record<string, unknown> | undefined;
  const lastPayment = billingInfo?.last_payment as Record<string, unknown> | undefined;
  const amountObj = lastPayment?.amount as { value?: string; currency_code?: string } | undefined;
  const amount = parsePayPalAmount(amountObj);
  const eventCurrency = amount.currency;
  const valueInCents = amount.cents;

  const planInfo = resource.plan_id ? String(resource.plan_id) : subId;
  const intervalUnit = (resource.billing_info as Record<string, unknown> | undefined)?.cycle_executions
    ? undefined
    : undefined;

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    valueInCents,
  );

  const billingInterval: BillingInterval = mapPayPalBillingInterval(null);

  await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      subscriptionId: subId,
      customerId,
      planId: planInfo,
      planName: String(resource.plan_id ?? subId),
      status: "active",
      valueInCents,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseValueInCents: baseGrossValueInCents,
      billingInterval,
      startedAt: resource.start_time ? new Date(String(resource.start_time)) : new Date(),
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

  const customerName = pickCustomerName(resource);
  const customerEmail = pickCustomerEmail(resource);

  if (customerEmail || customerName) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: customerName,
      email: customerEmail,
      phone: null,
      eventTimestamp: resource.start_time ? new Date(String(resource.start_time)) : new Date(),
    }).catch((err) => {
      console.error("[paypal-webhook] upsertCustomer (sub created) failed", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

async function handlePayPalSubscriptionCanceled(orgId: string, body: PayPalWebhookBody): Promise<void> {
  const resource = body.resource ?? {};
  const subId = String(resource.id ?? "");
  if (!subId) return;

  const customerId = pickCustomerId(resource);
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    "USD",
    orgCurrency,
    0,
  );
  const billingInterval: BillingInterval = mapPayPalBillingInterval(null);
  const eventHash = paypalEventHash(orgId, `sub_canceled:${subId}`);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "subscription_canceled",
      grossValueInCents: 0,
      currency: "USD",
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: "recurring",
      billingInterval,
      subscriptionId: subId,
      customerId,
      provider: "paypal",
      eventHash,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await insertPayment({
    organizationId: orgId,
    eventType: "subscription_canceled",
    grossValueInCents: 0,
    currency: "USD",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: "recurring",
    billingInterval,
    subscriptionId: subId,
    customerId,
    provider: "paypal",
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[paypal-webhook] insertPayment cancel failed", {
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

async function handlePayPalSubscriptionPastDue(orgId: string, body: PayPalWebhookBody): Promise<void> {
  const resource = body.resource ?? {};
  const subId = String(resource.id ?? "");
  if (!subId) return;
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subId));
}
