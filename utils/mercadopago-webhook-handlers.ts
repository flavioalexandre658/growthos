import { db } from "@/db";
import { events, subscriptions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  mercadopagoEventHash,
  fetchMercadoPagoResource,
  mapMercadoPagoPaymentStatus,
  mapMercadoPagoPreapprovalStatus,
  mapMercadoPagoBillingInterval,
  mapMercadoPagoPaymentMethod,
  type MPPayment,
  type MPPreapproval,
  type MPAuthorizedPayment,
  type MPWebhookBody,
} from "@/utils/mercadopago-helpers";
import { extractGrowthosCustomerId } from "@/utils/oauth-token-cache";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { resolveInternalCustomerId } from "@/utils/resolve-internal-customer-id";
import { checkMilestones } from "@/utils/milestones";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { createNotification } from "@/utils/create-notification";
import type { BillingInterval } from "@/utils/billing";

export type { MPWebhookBody };

function pickPaymentCustomerId(payment: MPPayment): string {
  const fromExternal = extractGrowthosCustomerId(payment.external_reference ?? null);
  if (fromExternal) return fromExternal;
  const fromMeta =
    (payment.metadata?.growthos_customer_id as string | undefined) ??
    (payment.metadata?.gos_customer_id as string | undefined);
  const fromMetaExtracted = extractGrowthosCustomerId(fromMeta ?? null);
  if (fromMetaExtracted) return fromMetaExtracted;
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

export async function handleMercadoPagoEvent(
  orgId: string,
  body: MPWebhookBody,
  accessToken: string,
): Promise<void> {
  const topic = (body.type ?? "").toLowerCase();
  const dataId = body.data?.id ? String(body.data.id) : null;
  if (!dataId) return;

  let shouldCheckMilestones = false;

  switch (topic) {
    case "payment": {
      const payment = await fetchMercadoPagoResource<MPPayment>(
        `/v1/payments/${dataId}`,
        accessToken,
      );
      if (!payment) return;
      const isRefund = payment.status === "refunded" || (payment.refunds && payment.refunds.length > 0);
      if (isRefund) {
        await handleMPRefund(orgId, payment);
      } else if (mapMercadoPagoPaymentStatus(payment.status) === "paid") {
        await handleMPPayment(orgId, payment);
        shouldCheckMilestones = true;
      }
      break;
    }
    case "subscription_preapproval": {
      const preapproval = await fetchMercadoPagoResource<MPPreapproval>(
        `/preapproval/${dataId}`,
        accessToken,
      );
      if (!preapproval) return;
      await handleMPPreapproval(orgId, preapproval);
      if (preapproval.status === "authorized") shouldCheckMilestones = true;
      break;
    }
    case "subscription_authorized_payment": {
      const authorized = await fetchMercadoPagoResource<MPAuthorizedPayment>(
        `/authorized_payments/${dataId}`,
        accessToken,
      );
      if (!authorized) return;
      if (authorized.payment?.id) {
        const payment = await fetchMercadoPagoResource<MPPayment>(
          `/v1/payments/${authorized.payment.id}`,
          accessToken,
        );
        if (payment && mapMercadoPagoPaymentStatus(payment.status) === "paid") {
          await handleMPPayment(orgId, payment, true);
          shouldCheckMilestones = true;
        }
      }
      break;
    }
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => console.error("[milestone-check]", err));
  }
}

async function handleMPPayment(
  orgId: string,
  payment: MPPayment,
  forceRecurring = false,
): Promise<void> {
  const grossValueInCents = Math.round((payment.transaction_amount ?? 0) * 100);
  if (!grossValueInCents) return;

  const fallbackCustomerId = pickPaymentCustomerId(payment);
  const customerEmail = payment.payer?.email?.toLowerCase() ?? null;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: customerEmail,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;
  const acq = await lookupAcquisitionContext(orgId, customerId, {
    email: payment.payer?.email ?? null,
  });

  const preapprovalId =
    (payment.metadata?.preapproval_id as string | undefined) ??
    payment.metadata_preapproval_id ??
    null;
  const recurring = forceRecurring || !!preapprovalId;

  const orgCurrency = await getOrgCurrency(orgId);
  const eventCurrency = (payment.currency_id ?? "BRL").toUpperCase();
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );

  let billingInterval: BillingInterval | null = null;
  if (recurring && preapprovalId) {
    const [existing] = await db
      .select({ billingInterval: subscriptions.billingInterval })
      .from(subscriptions)
      .where(eq(subscriptions.subscriptionId, preapprovalId))
      .limit(1);
    billingInterval = (existing?.billingInterval as BillingInterval) ?? null;
  }

  const billingReason = recurring ? "subscription_cycle" : null;
  const eventType = forceRecurring ? "renewal" : "purchase";
  const paymentMethod = mapMercadoPagoPaymentMethod(payment.payment_type_id ?? null);
  const paidAt = payment.date_approved
    ? new Date(payment.date_approved)
    : payment.date_created
      ? new Date(payment.date_created)
      : new Date();
  const eventHash = mercadopagoEventHash(orgId, String(payment.id));

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
        subscriptionId: preapprovalId,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        baseNetValueInCents: baseGrossValueInCents,
        createdAt: paidAt,
      },
    });

  await insertPayment(sharedCols).catch((err) => {
    console.error("[mercadopago-webhook] insertPayment failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (recurring && preapprovalId) {
    await db
      .update(subscriptions)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(subscriptions.subscriptionId, preapprovalId));
  }

  if (payment.payer) {
    const payerPhone = payment.payer.phone
      ? `${payment.payer.phone.area_code ?? ""}${payment.payer.phone.number ?? ""}`
      : null;
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name:
        [payment.payer.first_name, payment.payer.last_name].filter(Boolean).join(" ") || null,
      email: payment.payer.email ?? null,
      phone: payerPhone && payerPhone.length > 0 ? payerPhone : null,
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[mercadopago-webhook] upsertCustomer failed", {
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
      customerName:
        [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(" ") || null,
      valueInCents: grossValueInCents,
      currency: eventCurrency,
    },
  }).catch(() => {});
}

async function handleMPRefund(orgId: string, payment: MPPayment): Promise<void> {
  const grossValueInCents = Math.round((payment.transaction_amount ?? 0) * 100);
  if (!grossValueInCents) return;

  const fallbackCustomerId = pickPaymentCustomerId(payment);
  const customerEmail = payment.payer?.email?.toLowerCase() ?? null;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: customerEmail,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;
  const orgCurrency = await getOrgCurrency(orgId);
  const eventCurrency = (payment.currency_id ?? "BRL").toUpperCase();
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    grossValueInCents,
  );
  const eventHash = mercadopagoEventHash(orgId, `refund:${payment.id}`);

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
      provider: "mercadopago",
      eventHash,
      metadata: { paymentId: String(payment.id) },
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
    provider: "mercadopago",
    eventHash,
    metadata: { paymentId: String(payment.id) },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[mercadopago-webhook] insertPayment refund failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function handleMPPreapproval(orgId: string, preapproval: MPPreapproval): Promise<void> {
  const fallbackCustomerId = pickPreapprovalCustomerId(preapproval);
  const customerEmail = preapproval.payer_email?.toLowerCase() ?? null;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: customerEmail,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;
  const status = mapMercadoPagoPreapprovalStatus(preapproval.status);

  const recurring = preapproval.auto_recurring;
  const valueDecimal = recurring?.transaction_amount ?? 0;
  const valueInCents = Math.round(valueDecimal * 100);
  const eventCurrency = (recurring?.currency_id ?? "BRL").toUpperCase();
  const billingInterval = mapMercadoPagoBillingInterval(
    recurring?.frequency_type ?? null,
    recurring?.frequency ?? null,
  );

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    eventCurrency,
    orgCurrency,
    valueInCents,
  );

  const startedAt = recurring?.start_date
    ? new Date(recurring.start_date)
    : preapproval.date_created
      ? new Date(preapproval.date_created)
      : new Date();

  if (status === "canceled") {
    const eventHash = mercadopagoEventHash(orgId, `sub_canceled:${preapproval.id}`);
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
        subscriptionId: preapproval.id,
        customerId,
        provider: "mercadopago",
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
      subscriptionId: preapproval.id,
      customerId,
      provider: "mercadopago",
      eventHash,
      createdAt: new Date(),
    }).catch((err) => {
      console.error("[mercadopago-webhook] insertPayment cancel failed", {
        orgId,
        eventHash,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    await db
      .update(subscriptions)
      .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
      .where(eq(subscriptions.subscriptionId, preapproval.id));
    return;
  }

  await db
    .insert(subscriptions)
    .values({
      organizationId: orgId,
      subscriptionId: preapproval.id,
      customerId,
      planId: preapproval.id,
      planName: preapproval.reason ?? preapproval.id,
      status,
      valueInCents,
      currency: eventCurrency,
      baseCurrency,
      exchangeRate,
      baseValueInCents: baseGrossValueInCents,
      billingInterval,
      startedAt,
    })
    .onConflictDoUpdate({
      target: [subscriptions.subscriptionId],
      set: {
        status,
        valueInCents,
        baseCurrency,
        exchangeRate,
        baseValueInCents: baseGrossValueInCents,
        updatedAt: new Date(),
      },
    });

  if (preapproval.payer_email) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: null,
      email: preapproval.payer_email,
      phone: null,
      eventTimestamp: startedAt,
    }).catch((err) => {
      console.error("[mercadopago-webhook] upsertCustomer (preapproval) failed", {
        orgId,
        customerId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}
