import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations, events, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import {
  asaasEventHash,
  mapAsaasBillingType,
  mapAsaasBillingInterval,
} from "@/utils/asaas-helpers";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { checkMilestones } from "@/utils/milestones";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import type { BillingInterval } from "@/utils/billing";

interface AsaasPaymentPayload {
  id: string;
  customer: string;
  subscription: string | null;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  externalReference: string | null;
  installment: string | null;
  dueDate: string;
  paymentDate: string | null;
  dateCreated: string;
  description?: string | null;
}

interface AsaasSubscriptionPayload {
  id: string;
  customer: string;
  value: number;
  cycle: string;
  status: string;
  externalReference: string | null;
  dateCreated: string;
  description?: string | null;
}

interface AsaasWebhookBody {
  event: string;
  payment?: AsaasPaymentPayload;
  subscription?: AsaasSubscriptionPayload;
}

interface AsaasCustomerData {
  name: string | null;
  email: string | null;
  phone: string | null;
}

async function fetchAsaasCustomer(
  asaasCustomerId: string,
  apiKey: string,
): Promise<AsaasCustomerData | null> {
  try {
    const res = await fetch(`https://api.asaas.com/v3/customers/${asaasCustomerId}`, {
      headers: { access_token: apiKey },
    });
    if (!res.ok) return null;
    const data = await res.json() as { name?: string; email?: string; phone?: string; mobilePhone?: string };
    return {
      name: data.name ?? null,
      email: data.email ?? null,
      phone: data.phone ?? data.mobilePhone ?? null,
    };
  } catch {
    return null;
  }
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> },
) {
  const { integrationId } = await params;

  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (!integration || integration.status === "disconnected") {
    return new NextResponse("Unknown integration", { status: 400 });
  }

  if (!integration.providerMeta?.webhookSecret) {
    return new NextResponse("Webhook access token not configured", { status: 400 });
  }

  const token = req.headers.get("asaas-access-token");
  const expectedToken = decrypt(integration.providerMeta.webhookSecret);

  if (!token || token !== expectedToken) {
    return new NextResponse("Invalid access token", { status: 401 });
  }

  let body: AsaasWebhookBody;
  try {
    body = (await req.json()) as AsaasWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const orgId = integration.organizationId;
  const asaasApiKey = decrypt(integration.accessToken);

  await handleAsaasEvent(orgId, body, asaasApiKey).catch((err) => {
    console.error("[asaas-webhook]", body.event, err);
  });

  return new NextResponse(null, { status: 200 });
}

async function handleAsaasEvent(orgId: string, body: AsaasWebhookBody, asaasApiKey: string) {
  let shouldCheckMilestones = false;

  switch (body.event) {
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED":
      if (body.payment) {
        await handlePaymentReceived(orgId, body.payment, asaasApiKey);
        shouldCheckMilestones = true;
      }
      break;
    case "PAYMENT_REFUNDED":
      if (body.payment) {
        await handlePaymentRefunded(orgId, body.payment, asaasApiKey);
      }
      break;
    case "PAYMENT_OVERDUE":
      if (body.payment) {
        await handlePaymentOverdue(orgId, body.payment);
      }
      break;
    case "SUBSCRIPTION_CREATED":
      if (body.subscription) {
        await handleSubscriptionCreated(orgId, body.subscription, asaasApiKey);
        shouldCheckMilestones = true;
      }
      break;
    case "SUBSCRIPTION_UPDATED":
      if (body.subscription) {
        await handleSubscriptionUpdated(orgId, body.subscription, asaasApiKey);
        shouldCheckMilestones = true;
      }
      break;
    case "SUBSCRIPTION_DELETED":
    case "SUBSCRIPTION_INACTIVATED":
      if (body.subscription) {
        await handleSubscriptionCanceled(orgId, body.subscription, body.event, asaasApiKey);
      }
      break;
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => {
      console.error("[milestone-check]", err);
    });
  }
}

async function handlePaymentReceived(orgId: string, payment: AsaasPaymentPayload, asaasApiKey: string) {
  const customerId = payment.externalReference ?? payment.customer;
  const acq = await lookupAcquisitionContext(orgId, customerId);

  const isRecurring = !!payment.subscription;
  const orgCurrency = await getOrgCurrency(orgId);
  const grossValueInCents = Math.round(payment.value * 100);
  const netValueInCents = Math.round(payment.netValue * 100);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );

  let billingInterval: BillingInterval | null = null;
  if (isRecurring) {
    const [sub] = await db
      .select({ billingInterval: subscriptions.billingInterval })
      .from(subscriptions)
      .where(eq(subscriptions.subscriptionId, payment.subscription!))
      .limit(1);
    billingInterval = (sub?.billingInterval as BillingInterval) ?? null;
  }

  const billingReason = isRecurring ? "subscription_cycle" : null;
  const eventType = isRecurring ? "renewal" : "purchase";
  const paymentMethod = mapAsaasBillingType(payment.billingType);
  const paidAt = payment.paymentDate
    ? new Date(payment.paymentDate)
    : new Date(payment.dateCreated);
  const eventHash = asaasEventHash(orgId, payment.id);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType,
      grossValueInCents,
      currency: "BRL",
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      baseNetValueInCents: Math.round(netValueInCents * exchangeRate),
      billingType: isRecurring ? "recurring" : "one_time",
      billingReason,
      billingInterval,
      subscriptionId: payment.subscription,
      customerId,
      paymentMethod,
      provider: "asaas",
      eventHash,
      createdAt: paidAt,
      source: acq?.source ?? null,
      medium: acq?.medium ?? null,
      campaign: acq?.campaign ?? null,
      content: acq?.content ?? null,
      landingPage: acq?.landingPage ?? null,
      entryPage: acq?.entryPage ?? null,
      sessionId: acq?.sessionId ?? null,
    })
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        eventType,
        billingType: isRecurring ? "recurring" : "one_time",
        billingReason,
        billingInterval,
        subscriptionId: payment.subscription,
        currency: "BRL",
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        baseNetValueInCents: Math.round(netValueInCents * exchangeRate),
        createdAt: paidAt,
      },
    });

  await insertPayment({
    organizationId: orgId,
    eventType,
    grossValueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    baseNetValueInCents: Math.round(netValueInCents * exchangeRate),
    billingType: isRecurring ? "recurring" : "one_time",
    billingReason,
    billingInterval,
    subscriptionId: payment.subscription,
    customerId,
    paymentMethod,
    provider: "asaas",
    eventHash,
    createdAt: paidAt,
    source: acq?.source ?? null,
    medium: acq?.medium ?? null,
    campaign: acq?.campaign ?? null,
    content: acq?.content ?? null,
    landingPage: acq?.landingPage ?? null,
    entryPage: acq?.entryPage ?? null,
    sessionId: acq?.sessionId ?? null,
  }).catch((err) => {
    console.error("[asaas-webhook] insertPayment failed", {
      orgId,
      eventType,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (isRecurring) {
    await db
      .update(subscriptions)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(subscriptions.subscriptionId, payment.subscription!));
  }

  fetchAsaasCustomer(payment.customer, asaasApiKey).then((customerData) => {
    if (!customerData) return;
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[asaas-webhook] upsertCustomer failed (payment received)", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }).catch(() => {});
}

async function handlePaymentRefunded(orgId: string, payment: AsaasPaymentPayload, asaasApiKey: string) {
  if (!payment.value) return;

  const customerId = payment.externalReference ?? payment.customer;

  const orgCurrency = await getOrgCurrency(orgId);
  const grossValueInCents = Math.round(payment.value * 100);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );
  const eventHash = asaasEventHash(orgId, `refund:${payment.id}`);

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
      provider: "asaas",
      eventHash,
      metadata: { paymentId: payment.id },
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [events.organizationId, events.eventHash],
      set: {
        grossValueInCents: -grossValueInCents,
        currency: "BRL",
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
    provider: "asaas",
    eventHash,
    metadata: { paymentId: payment.id },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[asaas-webhook] insertPayment failed", {
      orgId,
      eventType: "refund",
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  fetchAsaasCustomer(payment.customer, asaasApiKey).then((customerData) => {
    if (!customerData) return;
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
    }).catch((err) => {
      console.error("[asaas-webhook] upsertCustomer failed (payment refunded)", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }).catch(() => {});
}

async function handlePaymentOverdue(orgId: string, payment: AsaasPaymentPayload) {
  if (!payment.subscription) return;

  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, payment.subscription));
}

async function handleSubscriptionCreated(
  orgId: string,
  sub: AsaasSubscriptionPayload,
  asaasApiKey: string,
) {
  const customerId = sub.externalReference ?? sub.customer;
  const billingInterval = mapAsaasBillingInterval(sub.cycle);

  const valueInCents = Math.round(sub.value * 100);
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    valueInCents,
  );

  await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      subscriptionId: sub.id,
      customerId,
      planId: sub.id,
      planName: sub.description ?? sub.id,
      status: "active",
      valueInCents,
      currency: "BRL",
      baseCurrency,
      exchangeRate,
      baseValueInCents: baseGrossValueInCents,
      billingInterval,
      startedAt: new Date(sub.dateCreated),
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

  fetchAsaasCustomer(sub.customer, asaasApiKey).then((customerData) => {
    if (!customerData) return;
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      eventTimestamp: new Date(sub.dateCreated),
    }).catch((err) => {
      console.error("[asaas-webhook] upsertCustomer failed (subscription created)", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }).catch(() => {});
}

async function handleSubscriptionUpdated(
  orgId: string,
  sub: AsaasSubscriptionPayload,
  asaasApiKey: string,
) {
  const [existing] = await db
    .select({ valueInCents: subscriptions.valueInCents })
    .from(subscriptions)
    .where(eq(subscriptions.subscriptionId, sub.id))
    .limit(1);

  const newValueInCents = Math.round(sub.value * 100);

  if (!existing || existing.valueInCents === newValueInCents) return;

  const customerId = sub.externalReference ?? sub.customer;
  const billingInterval = mapAsaasBillingInterval(sub.cycle);

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    newValueInCents,
  );

  const eventHash = asaasEventHash(orgId, `sub_changed:${sub.id}:${Date.now()}`);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "subscription_changed",
      grossValueInCents: newValueInCents,
      currency: "BRL",
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: "recurring",
      billingInterval,
      subscriptionId: sub.id,
      customerId,
      provider: "asaas",
      metadata: { previousValue: existing.valueInCents, newValue: newValueInCents },
      eventHash,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await insertPayment({
    organizationId: orgId,
    eventType: "subscription_changed",
    grossValueInCents: newValueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: "recurring",
    billingInterval,
    subscriptionId: sub.id,
    customerId,
    provider: "asaas",
    metadata: { previousValue: existing.valueInCents, newValue: newValueInCents },
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[asaas-webhook] insertPayment failed", {
      orgId,
      eventType: "subscription_changed",
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  await db
    .update(subscriptions)
    .set({
      valueInCents: newValueInCents,
      baseCurrency,
      exchangeRate,
      baseValueInCents: baseGrossValueInCents,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.subscriptionId, sub.id));

  fetchAsaasCustomer(sub.customer, asaasApiKey).then((customerData) => {
    if (!customerData) return;
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
    }).catch((err) => {
      console.error("[asaas-webhook] upsertCustomer failed (subscription updated)", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }).catch(() => {});
}

async function handleSubscriptionCanceled(
  orgId: string,
  sub: AsaasSubscriptionPayload,
  webhookEvent: string,
  asaasApiKey: string,
) {
  const customerId = sub.externalReference ?? sub.customer;
  const billingInterval = mapAsaasBillingInterval(sub.cycle);

  const valueInCents = Math.round(sub.value * 100);
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    valueInCents,
  );

  const eventHash = asaasEventHash(orgId, `${webhookEvent}:${sub.id}`);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "subscription_canceled",
      grossValueInCents: valueInCents,
      currency: "BRL",
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: "recurring",
      billingInterval,
      subscriptionId: sub.id,
      customerId,
      provider: "asaas",
      eventHash,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await insertPayment({
    organizationId: orgId,
    eventType: "subscription_canceled",
    grossValueInCents: valueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: "recurring",
    billingInterval,
    subscriptionId: sub.id,
    customerId,
    provider: "asaas",
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[asaas-webhook] insertPayment failed", {
      orgId,
      eventType: "subscription_canceled",
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  await db
    .update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, sub.id));

  fetchAsaasCustomer(sub.customer, asaasApiKey).then((customerData) => {
    if (!customerData) return;
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
    }).catch((err) => {
      console.error("[asaas-webhook] upsertCustomer failed (subscription canceled)", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }).catch(() => {});
}
