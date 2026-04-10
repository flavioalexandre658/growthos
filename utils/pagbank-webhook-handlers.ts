import { db } from "@/db";
import { events, subscriptions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  pagbankEventHash,
  mapPagBankChargeStatus,
  mapPagBankPaymentMethod,
} from "@/utils/pagbank-helpers";
import { extractGrowthosCustomerId } from "@/utils/oauth-token-cache";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { checkMilestones } from "@/utils/milestones";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { createNotification } from "@/utils/create-notification";
import type { BillingInterval } from "@/utils/billing";

export interface PagBankCharge {
  id?: string | null;
  reference_id?: string | null;
  status?: string | null;
  amount?: { value?: number | null; currency?: string | null } | null;
  payment_method?: { type?: string | null } | null;
  paid_at?: string | null;
  created_at?: string | null;
}

export interface PagBankCustomer {
  name?: string | null;
  email?: string | null;
  tax_id?: string | null;
  phones?: Array<{ type?: string; area?: string; number?: string }> | null;
}

export interface PagBankWebhookBody {
  id?: string | null;
  reference_id?: string | null;
  charges?: PagBankCharge[] | null;
  customer?: PagBankCustomer | null;
  notification_urls?: string[] | null;
  created_at?: string | null;
  items?: Array<{ name?: string; quantity?: number; unit_amount?: number }> | null;
}

function pickCustomerId(body: PagBankWebhookBody): string {
  const fromRef = extractGrowthosCustomerId(body.reference_id ?? null);
  if (fromRef) return fromRef;
  if (body.customer?.email) return body.customer.email.toLowerCase();
  if (body.customer?.tax_id) return body.customer.tax_id;
  return body.id ?? "unknown";
}

function pickCustomerPhone(customer: PagBankCustomer | null | undefined): string | null {
  if (!customer?.phones?.length) return null;
  const phone = customer.phones[0];
  return `${phone.area ?? ""}${phone.number ?? ""}`;
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

export async function handlePagBankEvent(orgId: string, body: PagBankWebhookBody): Promise<void> {
  if (!body.charges?.length) return;
  let shouldCheckMilestones = false;

  for (const charge of body.charges) {
    const status = mapPagBankChargeStatus(charge.status);
    if (status === "paid") {
      await handlePagBankChargePaid(orgId, body, charge);
      shouldCheckMilestones = true;
    } else if (status === "refunded") {
      await handlePagBankChargeRefunded(orgId, body, charge);
    } else if (status === "past_due") {
      // noop
    }
  }

  if (shouldCheckMilestones) {
    checkMilestones(orgId).catch((err) => console.error("[milestone-check]", err));
  }
}

async function handlePagBankChargePaid(
  orgId: string,
  body: PagBankWebhookBody,
  charge: PagBankCharge,
): Promise<void> {
  const chargeId = charge.id ?? body.id ?? "";
  if (!chargeId) return;
  const grossValueInCents = charge.amount?.value ?? 0;
  if (!grossValueInCents) return;

  const customerId = pickCustomerId(body);
  const acq = await lookupAcquisitionContext(orgId, customerId);

  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );

  const eventType = "purchase";
  const paymentMethod = mapPagBankPaymentMethod(charge.payment_method?.type ?? null);
  const paidAt = charge.paid_at
    ? new Date(charge.paid_at)
    : charge.created_at
      ? new Date(charge.created_at)
      : new Date();
  const eventHash = pagbankEventHash(orgId, chargeId);

  const sharedCols = {
    organizationId: orgId,
    eventType,
    grossValueInCents,
    currency: "BRL",
    baseCurrency,
    exchangeRate,
    baseGrossValueInCents,
    baseNetValueInCents: baseGrossValueInCents,
    billingType: "one_time" as const,
    billingReason: null,
    billingInterval: null as BillingInterval | null,
    subscriptionId: null,
    customerId,
    paymentMethod,
    provider: "pagbank",
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
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents,
        baseNetValueInCents: baseGrossValueInCents,
        createdAt: paidAt,
      },
    });

  await insertPayment(sharedCols).catch((err) => {
    console.error("[pagbank-webhook] insertPayment failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  if (body.customer) {
    upsertCustomer({
      organizationId: orgId,
      customerId,
      name: body.customer.name ?? null,
      email: body.customer.email ?? null,
      phone: pickCustomerPhone(body.customer),
      eventTimestamp: paidAt,
    }).catch((err) => {
      console.error("[pagbank-webhook] upsertCustomer failed", {
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
    type: "purchase",
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

async function handlePagBankChargeRefunded(
  orgId: string,
  body: PagBankWebhookBody,
  charge: PagBankCharge,
): Promise<void> {
  const chargeId = charge.id ?? body.id ?? "";
  if (!chargeId) return;
  const grossValueInCents = charge.amount?.value ?? 0;
  if (!grossValueInCents) return;

  const customerId = pickCustomerId(body);
  const orgCurrency = await getOrgCurrency(orgId);
  const { baseCurrency, exchangeRate, baseGrossValueInCents } = await computeBaseValue(
    orgId,
    orgCurrency,
    grossValueInCents,
  );
  const eventHash = pagbankEventHash(orgId, `refund:${chargeId}`);

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
      provider: "pagbank",
      eventHash,
      metadata: { chargeId },
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
    provider: "pagbank",
    eventHash,
    metadata: { chargeId },
    createdAt: new Date(),
  }).catch((err) => {
    console.error("[pagbank-webhook] insertPayment refund failed", {
      orgId,
      eventHash,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
