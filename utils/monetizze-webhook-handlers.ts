import { db } from "@/db";
import { events, subscriptions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  monetizzeEventHash,
  mapMonetizzeStatus,
  mapMonetizzeSubscriptionStatus,
  mapMonetizzeBillingInterval,
  mapMonetizzePaymentMethod,
  getMonetizzeNestedField,
} from "@/utils/monetizze-helpers";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { resolveInternalCustomerId } from "@/utils/resolve-internal-customer-id";
import { checkMilestones } from "@/utils/milestones";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { createNotification } from "@/utils/create-notification";
import type { BillingInterval } from "@/utils/billing";

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

export async function handleMonetizzeEvent(
  orgId: string,
  fields: URLSearchParams,
): Promise<void> {
  const statusCode = getMonetizzeNestedField(fields, "venda", "codigo_status");
  const statusText = getMonetizzeNestedField(fields, "venda", "status");
  const normalized = mapMonetizzeStatus(statusCode ?? statusText);
  let shouldCheckMilestones = false;

  if (normalized === "paid") {
    await handleMonetizzePurchase(orgId, fields);
    shouldCheckMilestones = true;
  } else if (normalized === "refunded") {
    await handleMonetizzeRefund(orgId, fields);
  } else if (normalized === "past_due") {
    const subCode = getMonetizzeNestedField(fields, "assinatura", "codigo");
    if (subCode) {
      await handleMonetizzeSubscriptionPastDue(subCode);
    }
  }

  const subCode = getMonetizzeNestedField(fields, "assinatura", "codigo");
  const subStatus = getMonetizzeNestedField(fields, "assinatura", "status");
  if (subCode && subStatus) {
    const subNormalized = mapMonetizzeSubscriptionStatus(subStatus);
    if (subNormalized === "canceled") {
      await handleMonetizzeSubscriptionCanceled(orgId, fields, subCode);
    }
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => console.error("[milestone-check]", err));
  }
}

async function handleMonetizzePurchase(orgId: string, fields: URLSearchParams): Promise<void> {
  const vendaCodigo = getMonetizzeNestedField(fields, "venda", "codigo");
  if (!vendaCodigo) return;

  const valorStr = getMonetizzeNestedField(fields, "venda", "valor") ?? "0";
  const grossValueInCents = Math.round(parseFloat(valorStr) * 100);
  if (!grossValueInCents) return;

  const email = getMonetizzeNestedField(fields, "comprador", "email");
  const fallbackCustomerId = email ? email.toLowerCase() : vendaCodigo;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: email?.toLowerCase() ?? null,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;
  const acq = await lookupAcquisitionContext(orgId, customerId, {
    email: email ?? null,
  });

  const subCode = getMonetizzeNestedField(fields, "assinatura", "codigo");
  const recurring = !!subCode;

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );

  const netStr = getMonetizzeNestedField(fields, "venda", "valorRecebido") ?? valorStr;
  const netCents = Math.round(parseFloat(netStr) * 100);

  const billingInterval: BillingInterval | null = recurring
    ? mapMonetizzeBillingInterval(getMonetizzeNestedField(fields, "assinatura", "plano"))
    : null;

  const parcela = getMonetizzeNestedField(fields, "assinatura", "parcela");
  const isRenewal = recurring && parcela ? parseInt(parcela, 10) > 1 : false;
  const billingReason = recurring ? "subscription_cycle" : null;
  const eventType = isRenewal ? "renewal" : "purchase";
  const paymentMethod = mapMonetizzePaymentMethod(
    getMonetizzeNestedField(fields, "venda", "formaPagamento"),
  );

  const dateStr = getMonetizzeNestedField(fields, "venda", "dataFinalizada") ??
    getMonetizzeNestedField(fields, "venda", "dataInicio");
  const paidAt = dateStr ? new Date(dateStr) : new Date();
  const eventHash = monetizzeEventHash(orgId, vendaCodigo);

  const productCode = getMonetizzeNestedField(fields, "produto", "codigo");
  const productName = getMonetizzeNestedField(fields, "produto", "nome");

  const sharedCols = {
    organizationId: orgId,
    eventType,
    grossValueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    baseNetValueInCents: Math.round(netCents * exchangeRate),
    billingType: recurring ? ("recurring" as const) : ("one_time" as const),
    billingReason,
    billingInterval,
    subscriptionId: subCode,
    customerId,
    paymentMethod,
    provider: "monetizze",
    eventHash,
    createdAt: paidAt,
    productId: productCode,
    productName,
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
        subscriptionId: subCode,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        baseNetValueInCents: Math.round(netCents * exchangeRate),
        createdAt: paidAt,
      },
    });

  await insertPayment(sharedCols).catch((err) => {
    console.error("[monetizze-webhook] insertPayment failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (recurring && subCode) {
    await db
      .insert(subscriptions)
      .values({
        organizationId: orgId,
        subscriptionId: subCode,
        customerId,
        planId: productCode ?? subCode,
        planName: productName ?? subCode,
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

  const nome = getMonetizzeNestedField(fields, "comprador", "nome");
  const telefone = getMonetizzeNestedField(fields, "comprador", "telefone");
  if (email || nome) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: nome,
      email,
      phone: telefone,
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[monetizze-webhook] upsertCustomer failed", {
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
    metadata: { customerId, customerName: nome, valueInCents: grossValueInCents, currency: "BRL" },
  }).catch(() => {});
}

async function handleMonetizzeRefund(orgId: string, fields: URLSearchParams): Promise<void> {
  const vendaCodigo = getMonetizzeNestedField(fields, "venda", "codigo");
  if (!vendaCodigo) return;

  const valorStr = getMonetizzeNestedField(fields, "venda", "valor") ?? "0";
  const grossValueInCents = Math.round(parseFloat(valorStr) * 100);
  if (!grossValueInCents) return;

  const email = getMonetizzeNestedField(fields, "comprador", "email");
  const fallbackCustomerId = email ? email.toLowerCase() : vendaCodigo;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: email?.toLowerCase() ?? null,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );
  const eventHash = monetizzeEventHash(orgId, `refund:${vendaCodigo}`);

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
      provider: "monetizze",
      eventHash,
      metadata: { vendaCodigo },
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
    provider: "monetizze",
    eventHash,
    metadata: { vendaCodigo },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[monetizze-webhook] insertPayment refund failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function handleMonetizzeSubscriptionCanceled(
  orgId: string,
  fields: URLSearchParams,
  subCode: string,
): Promise<void> {
  const email = getMonetizzeNestedField(fields, "comprador", "email");
  const fallbackCustomerId = email ? email.toLowerCase() : subCode;
  const customerId =
    (await resolveInternalCustomerId(orgId, {
      email: email?.toLowerCase() ?? null,
      fallbackId: fallbackCustomerId,
    })) ?? fallbackCustomerId;

  const valorStr = getMonetizzeNestedField(fields, "venda", "valor") ?? "0";
  const grossValueInCents = Math.round(parseFloat(valorStr) * 100);
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );
  const billingInterval: BillingInterval = mapMonetizzeBillingInterval(
    getMonetizzeNestedField(fields, "assinatura", "plano"),
  );
  const eventHash = monetizzeEventHash(orgId, `sub_canceled:${subCode}`);

  await db
    .insert(events)
    .values({
      organizationId: orgId,
      eventType: "subscription_canceled",
      grossValueInCents,
      currency: "BRL",
      baseCurrency,
      exchangeRate,
      baseGrossValueInCents,
      billingType: "recurring",
      billingInterval,
      subscriptionId: subCode,
      customerId,
      provider: "monetizze",
      eventHash,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await insertPayment({
    organizationId: orgId,
    eventType: "subscription_canceled",
    grossValueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    billingType: "recurring",
    billingInterval,
    subscriptionId: subCode,
    customerId,
    provider: "monetizze",
    eventHash,
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[monetizze-webhook] insertPayment cancel failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  await db
    .update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subCode));
}

async function handleMonetizzeSubscriptionPastDue(subCode: string): Promise<void> {
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.subscriptionId, subCode));
}
