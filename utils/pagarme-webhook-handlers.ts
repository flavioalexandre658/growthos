import { db } from "@/db";
import { events, subscriptions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  pagarmeEventHash,
  mapPagarmeBillingInterval,
  mapPagarmePaymentMethod,
} from "@/utils/pagarme-helpers";
import { extractGrowthosCustomerId } from "@/utils/oauth-token-cache";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { resolveInternalCustomerId } from "@/utils/resolve-internal-customer-id";
import { checkMilestones } from "@/utils/milestones";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { createNotification } from "@/utils/create-notification";
import type { BillingInterval } from "@/utils/billing";

export interface PagarmeCustomer {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phones?: {
    mobile_phone?: { country_code?: string; area_code?: string; number?: string } | null;
    home_phone?: { country_code?: string; area_code?: string; number?: string } | null;
  } | null;
  document?: string | null;
  metadata?: Record<string, string> | null;
}

export interface PagarmeCharge {
  id?: string | null;
  code?: string | null;
  amount?: number | null;
  paid_amount?: number | null;
  status?: string | null;
  currency?: string | null;
  payment_method?: string | null;
  customer?: PagarmeCustomer | null;
  last_transaction?: {
    id?: string | null;
    transaction_type?: string | null;
    gateway_id?: string | null;
    amount?: number | null;
    status?: string | null;
    paid_at?: string | null;
    created_at?: string | null;
  } | null;
  created_at?: string | null;
  paid_at?: string | null;
  metadata?: Record<string, string> | null;
  invoice_id?: string | null;
  subscription_id?: string | null;
}

export interface PagarmeOrder {
  id?: string | null;
  code?: string | null;
  amount?: number | null;
  total_amount?: number | null;
  currency?: string | null;
  status?: string | null;
  customer?: PagarmeCustomer | null;
  charges?: PagarmeCharge[] | null;
  metadata?: Record<string, string> | null;
  created_at?: string | null;
  closed_at?: string | null;
}

export interface PagarmeSubscriptionPlan {
  id?: string | null;
  name?: string | null;
  interval?: string | null;
  interval_count?: number | null;
}

export interface PagarmeSubscription {
  id?: string | null;
  code?: string | null;
  status?: string | null;
  currency?: string | null;
  interval?: string | null;
  interval_count?: number | null;
  billing_type?: string | null;
  customer?: PagarmeCustomer | null;
  plan?: PagarmeSubscriptionPlan | null;
  items?: Array<{
    id?: string | null;
    description?: string | null;
    quantity?: number | null;
    pricing_scheme?: { price?: number | null } | null;
  }> | null;
  start_at?: string | null;
  next_billing_at?: string | null;
  canceled_at?: string | null;
  metadata?: Record<string, string> | null;
}

export interface PagarmeInvoice {
  id?: string | null;
  status?: string | null;
  amount?: number | null;
  subscription?: PagarmeSubscription | null;
  charge?: PagarmeCharge | null;
}

export interface PagarmeWebhookBody {
  id?: string;
  account?: { id?: string; name?: string } | null;
  type?: string;
  created_at?: string;
  data?:
    | PagarmeOrder
    | PagarmeCharge
    | PagarmeSubscription
    | PagarmeInvoice
    | Record<string, unknown>;
}

function pickCustomerId(
  entity: PagarmeOrder | PagarmeCharge | PagarmeSubscription | null | undefined,
): string {
  if (!entity) return "unknown";
  const metadataValue =
    (entity.metadata?.growthos_customer_id as string | undefined) ??
    (entity.metadata?.gos_customer_id as string | undefined);
  const fromMeta = extractGrowthosCustomerId(metadataValue ?? null);
  if (fromMeta) return fromMeta;
  const customer = entity.customer;
  if (customer?.metadata) {
    const customerMeta =
      (customer.metadata.growthos_customer_id as string | undefined) ??
      (customer.metadata.gos_customer_id as string | undefined);
    const fromCustomerMeta = extractGrowthosCustomerId(customerMeta ?? null);
    if (fromCustomerMeta) return fromCustomerMeta;
  }
  if (customer?.id) return customer.id;
  if (customer?.email) return customer.email.toLowerCase();
  if (customer?.document) return customer.document;
  return "unknown";
}

function pickCustomerPhone(customer: PagarmeCustomer | null | undefined): string | null {
  if (!customer?.phones) return null;
  const mobile = customer.phones.mobile_phone;
  if (mobile?.number) {
    return `${mobile.country_code ?? ""}${mobile.area_code ?? ""}${mobile.number}`;
  }
  const home = customer.phones.home_phone;
  if (home?.number) {
    return `${home.country_code ?? ""}${home.area_code ?? ""}${home.number}`;
  }
  return null;
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

export async function handlePagarmeEvent(
  orgId: string,
  body: PagarmeWebhookBody,
): Promise<void> {
  const eventType = (body.type ?? "").toLowerCase();
  let shouldCheckMilestones = false;

  switch (eventType) {
    case "order.paid":
    case "charge.paid":
      await handlePagarmePaid(orgId, body);
      shouldCheckMilestones = true;
      break;
    case "subscription.charges_paid":
      await handlePagarmePaid(orgId, body, true);
      shouldCheckMilestones = true;
      break;
    case "charge.refunded":
    case "charge.chargedback":
      await handlePagarmeRefund(orgId, body);
      break;
    case "order.canceled":
    case "order.payment_failed":
    case "charge.payment_failed":
      await handlePagarmeFailed(orgId, body);
      break;
    case "subscription.created":
      await handlePagarmeSubscriptionCreated(orgId, body);
      break;
    case "subscription.canceled":
      await handlePagarmeSubscriptionCanceled(orgId, body);
      break;
    case "subscription.charges_payment_failed":
      await handlePagarmeSubscriptionPastDue(orgId, body);
      break;
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => console.error("[milestone-check]", err));
  }
}

function extractChargeAndOrder(body: PagarmeWebhookBody): {
  charge: PagarmeCharge | null;
  order: PagarmeOrder | null;
  subscription: PagarmeSubscription | null;
} {
  const data = body.data as Record<string, unknown> | undefined;
  if (!data) return { charge: null, order: null, subscription: null };

  if (body.type?.startsWith("charge.")) {
    const charge = data as PagarmeCharge;
    return { charge, order: null, subscription: null };
  }
  if (body.type?.startsWith("order.")) {
    const order = data as PagarmeOrder;
    const firstCharge = order.charges && order.charges.length > 0 ? order.charges[0] : null;
    return { charge: firstCharge, order, subscription: null };
  }
  if (body.type?.startsWith("subscription.")) {
    const invoice = data as PagarmeInvoice;
    if (invoice.subscription) {
      return {
        charge: invoice.charge ?? null,
        order: null,
        subscription: invoice.subscription,
      };
    }
    const subscription = data as PagarmeSubscription;
    return { charge: null, order: null, subscription };
  }
  return { charge: null, order: null, subscription: null };
}

async function handlePagarmePaid(
  orgId: string,
  body: PagarmeWebhookBody,
  forceRecurring = false,
): Promise<void> {
  const { charge, order, subscription } = extractChargeAndOrder(body);
  const externalId = charge?.id ?? order?.id ?? body.id ?? "";
  if (!externalId) return;

  const grossValueInCents =
    charge?.paid_amount ?? charge?.amount ?? order?.amount ?? order?.total_amount ?? 0;
  if (!grossValueInCents) return;

  const sourceEntity = charge ?? order ?? subscription;
  const fallbackCustomerId = pickCustomerId(sourceEntity);
  const customerEmail = sourceEntity?.customer?.email?.toLowerCase() ?? null;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: customerEmail,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;
  const acq = await lookupAcquisitionContext(orgId, customerId, {
    email: sourceEntity?.customer?.email ?? null,
  });

  const recurring = forceRecurring || !!charge?.subscription_id || !!subscription;

  const orgCurrency = await getOrgCurrency(orgId);
  const eventCurrency = (charge?.currency ?? order?.currency ?? "BRL").toUpperCase();
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );

  const billingInterval: BillingInterval | null = recurring
    ? mapPagarmeBillingInterval(
        subscription?.interval ?? subscription?.plan?.interval ?? null,
        subscription?.interval_count ?? subscription?.plan?.interval_count ?? null,
      )
    : null;

  const billingReason = recurring ? "subscription_cycle" : null;
  const eventType = forceRecurring ? "renewal" : "purchase";
  const paymentMethod = mapPagarmePaymentMethod(charge?.payment_method ?? null);
  const paidAt = charge?.paid_at
    ? new Date(charge.paid_at)
    : charge?.created_at
      ? new Date(charge.created_at)
      : order?.created_at
        ? new Date(order.created_at)
        : new Date();
  const eventHash = pagarmeEventHash(orgId, String(externalId));

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
    subscriptionId: charge?.subscription_id ?? subscription?.id ?? null,
    customerId,
    paymentMethod,
    provider: "pagarme",
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
        subscriptionId: charge?.subscription_id ?? subscription?.id ?? null,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        baseNetValueInCents: baseGrossValueInCents,
        createdAt: paidAt,
      },
    });

  await insertPayment(sharedCols).catch((err) => {
    console.error("[pagarme-webhook] insertPayment failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (recurring && (charge?.subscription_id || subscription?.id)) {
    const subId = charge?.subscription_id ?? subscription?.id;
    if (subId) {
      await db
        .update(subscriptions)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(subscriptions.subscriptionId, subId));
    }
  }

  const customer = charge?.customer ?? order?.customer ?? subscription?.customer ?? null;
  if (customer) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: customer.name ?? null,
      email: customer.email ?? null,
      phone: pickCustomerPhone(customer),
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[pagarme-webhook] upsertCustomer failed", {
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
      customerName: customer?.name ?? null,
      valueInCents: grossValueInCents,
      currency: eventCurrency,
    },
  }).catch(() => {});
}

async function handlePagarmeRefund(orgId: string, body: PagarmeWebhookBody): Promise<void> {
  const { charge } = extractChargeAndOrder(body);
  const externalId = charge?.id ?? body.id ?? "";
  if (!externalId) return;

  const grossValueInCents = charge?.amount ?? charge?.paid_amount ?? 0;
  if (!grossValueInCents) return;

  const fallbackCustomerId = pickCustomerId(charge);
  const customerEmail = charge?.customer?.email?.toLowerCase() ?? null;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: customerEmail,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;
  const orgCurrency = await getOrgCurrency(orgId);
  const eventCurrency = (charge?.currency ?? "BRL").toUpperCase();
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );
  const eventHash = pagarmeEventHash(orgId, `refund:${externalId}`);

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
      provider: "pagarme",
      eventHash,
      metadata: { chargeId: externalId },
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
    provider: "pagarme",
    eventHash,
    metadata: { chargeId: externalId },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[pagarme-webhook] insertPayment refund failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function handlePagarmeFailed(orgId: string, body: PagarmeWebhookBody): Promise<void> {
  const { charge } = extractChargeAndOrder(body);
  const subId = charge?.subscription_id;
  if (!subId) return;
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subId));
}

async function handlePagarmeSubscriptionCreated(
  orgId: string,
  body: PagarmeWebhookBody,
): Promise<void> {
  const subscription = body.data as PagarmeSubscription | undefined;
  if (!subscription?.id) return;

  const fallbackCustomerId = pickCustomerId(subscription);
  const customerEmail = subscription.customer?.email?.toLowerCase() ?? null;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: customerEmail,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;
  const eventCurrency = (subscription.currency ?? "BRL").toUpperCase();
  const item = subscription.items && subscription.items.length > 0 ? subscription.items[0] : null;
  const valueInCents = item?.pricing_scheme?.price ?? 0;
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    valueInCents,
  );
  const billingInterval = mapPagarmeBillingInterval(
    subscription.interval ?? subscription.plan?.interval ?? null,
    subscription.interval_count ?? subscription.plan?.interval_count ?? null,
  );

  await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      subscriptionId: subscription.id,
      customerId,
      planId: subscription.plan?.id ?? subscription.id,
      planName: subscription.plan?.name ?? item?.description ?? subscription.id,
      status: "active",
      valueInCents,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseValueInCents: baseGrossValueInCents,
      billingInterval,
      startedAt: subscription.start_at ? new Date(subscription.start_at) : new Date(),
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

  if (subscription.customer) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: subscription.customer.name ?? null,
      email: subscription.customer.email ?? null,
      phone: pickCustomerPhone(subscription.customer),
      eventTimestamp: subscription.start_at ? new Date(subscription.start_at) : new Date(),
    }).catch((err) => {
      console.error("[pagarme-webhook] upsertCustomer (sub created) failed", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

async function handlePagarmeSubscriptionCanceled(
  orgId: string,
  body: PagarmeWebhookBody,
): Promise<void> {
  const subscription = body.data as PagarmeSubscription | undefined;
  if (!subscription?.id) return;

  const fallbackCustomerId = pickCustomerId(subscription);
  const customerEmail = subscription.customer?.email?.toLowerCase() ?? null;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: customerEmail,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;
  const eventCurrency = (subscription.currency ?? "BRL").toUpperCase();
  const item = subscription.items && subscription.items.length > 0 ? subscription.items[0] : null;
  const valueInCents = item?.pricing_scheme?.price ?? 0;
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    valueInCents,
  );
  const billingInterval: BillingInterval = mapPagarmeBillingInterval(
    subscription.interval ?? subscription.plan?.interval ?? null,
    subscription.interval_count ?? subscription.plan?.interval_count ?? null,
  );
  const eventHash = pagarmeEventHash(orgId, `sub_canceled:${subscription.id}`);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "subscription_canceled",
      grossValueInCents: valueInCents,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: "recurring",
      billingInterval,
      subscriptionId: subscription.id,
      customerId,
      provider: "pagarme",
      eventHash,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await insertPayment({
    organizationId: orgId,
    eventType: "subscription_canceled",
    grossValueInCents: valueInCents,
    currency: eventCurrency,
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: "recurring",
    billingInterval,
    subscriptionId: subscription.id,
    customerId,
    provider: "pagarme",
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[pagarme-webhook] insertPayment cancel failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  await db
    .update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subscription.id));
}

async function handlePagarmeSubscriptionPastDue(
  orgId: string,
  body: PagarmeWebhookBody,
): Promise<void> {
  const subscription = body.data as PagarmeSubscription | undefined;
  if (!subscription?.id) return;
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subscription.id));
}
