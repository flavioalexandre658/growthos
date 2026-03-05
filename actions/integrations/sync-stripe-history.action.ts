"use server";

import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations, events, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { hashAnonymous } from "@/lib/hash";
import { eq, and } from "drizzle-orm";
import { extractSubscriptionIdFromInvoice, mapBillingInterval, stripeEventHash } from "@/utils/stripe-helpers";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
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

async function getOrgCurrency(organizationId: string): Promise<string> {
  const [org] = await db
    .select({ currency: organizations.currency })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return org?.currency ?? "BRL";
}

async function computeBaseValue(
  organizationId: string,
  eventCurrency: string,
  orgCurrency: string,
  grossValueInCents: number,
): Promise<{ baseCurrency: string; exchangeRate: number; baseValueInCents: number }> {
  const rate = await resolveExchangeRate(organizationId, eventCurrency, orgCurrency);
  const resolvedRate = rate ?? 1;
  return {
    baseCurrency: orgCurrency,
    exchangeRate: resolvedRate,
    baseValueInCents: Math.round(grossValueInCents * resolvedRate),
  };
}

export async function syncStripeHistory(
  organizationId: string,
  integrationId: string,
): Promise<{
  subscriptionsSynced: number;
  invoicesSynced: number;
  oneTimePurchasesSynced: number;
}> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

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

  const stripe = new Stripe(decrypt(integration.accessToken));
  const orgCurrency = await getOrgCurrency(organizationId);

  await db
    .delete(events)
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(events.provider, "stripe"),
      ),
    );

  let subscriptionsSynced = 0;
  let invoicesSynced = 0;
  let oneTimePurchasesSynced = 0;
  const subIntervalMap = new Map<string, BillingInterval>();

  try {
    for await (const sub of stripe.subscriptions.list({ limit: 100, status: "all" })) {
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const item = sub.items.data[0];
      const interval = item?.price.recurring?.interval ?? "month";
      const intervalCount = item?.price.recurring?.interval_count ?? 1;
      const billingInterval = mapBillingInterval(interval, intervalCount);

      subIntervalMap.set(sub.id, billingInterval);

      const eventCurrency = sub.currency.toUpperCase();
      const valueInCents = item?.price.unit_amount ?? 0;
      const { baseCurrency, exchangeRate, baseValueInCents } = await computeBaseValue(
        organizationId,
        eventCurrency,
        orgCurrency,
        valueInCents,
      );

      await db
        .insert(subscriptions)
        .values({
          organizationId,
          subscriptionId: sub.id,
          customerId: hashAnonymous(customerId),
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
        })
        .onConflictDoUpdate({
          target: [subscriptions.subscriptionId],
          set: {
            status: mapStripeStatus(sub.status),
            canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
            baseCurrency,
            exchangeRate,
            baseValueInCents,
            updatedAt: new Date(),
          },
        });

      subscriptionsSynced++;
    }

    interface InvoiceBillingDetails {
      invoiceId: string;
      rawCustomerId: string;
      amountPaid: number;
      currency: string;
      subscriptionId: string | null;
      isRecurring: boolean;
      billingReason: string | null;
      eventType: "renewal" | "purchase";
      billingInterval: BillingInterval | undefined;
    }

    const invoiceBillingMap = new Map<string, InvoiceBillingDetails>();
    const chargedInvoiceIds = new Set<string>();

    for await (const invoice of stripe.invoices.list({ limit: 100, status: "paid" })) {
      if (!invoice.amount_paid) continue;

      const rawCustomerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
      const subscriptionId = extractSubscriptionIdFromInvoice(invoice);
      const isRecurring = !!subscriptionId;
      const billingInterval = isRecurring
        ? (subIntervalMap.get(subscriptionId!) ?? "monthly")
        : undefined;
      const billingReason = invoice.billing_reason ?? null;
      const eventType =
        isRecurring && billingReason === "subscription_cycle" ? "renewal" : "purchase";

      invoiceBillingMap.set(invoice.id, {
        invoiceId: invoice.id,
        rawCustomerId,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency.toUpperCase(),
        subscriptionId,
        isRecurring,
        billingReason,
        eventType,
        billingInterval: billingInterval as BillingInterval | undefined,
      });
    }

    for await (const charge of stripe.charges.list({ limit: 100 })) {
      if (charge.status !== "succeeded") continue;
      if (!charge.amount) continue;

      const chargeInvoiceId = (charge as Stripe.Charge & { invoice?: string | null }).invoice;
      const billing = chargeInvoiceId ? invoiceBillingMap.get(chargeInvoiceId) : undefined;

      if (chargeInvoiceId) chargedInvoiceIds.add(chargeInvoiceId);

      const rawCustomerId =
        typeof charge.customer === "string"
          ? charge.customer
          : charge.customer?.id ?? billing?.rawCustomerId ?? null;
      const hashedCustomerId = rawCustomerId ? hashAnonymous(rawCustomerId) : null;
      const acq = hashedCustomerId
        ? await lookupAcquisitionContext(organizationId, hashedCustomerId)
        : null;

      const pm = charge.payment_method_details?.type ?? "credit_card";
      const eventCurrency = (billing?.currency ?? charge.currency).toUpperCase();
      const grossValue = billing?.amountPaid ?? charge.amount;
      const { baseCurrency, exchangeRate, baseValueInCents } = await computeBaseValue(
        organizationId,
        eventCurrency,
        orgCurrency,
        grossValue,
      );

      const eventType = billing?.eventType ?? "purchase";
      const isRecurring = billing?.isRecurring ?? false;
      const billingReason = billing?.billingReason ?? null;
      const subscriptionId = billing?.subscriptionId ?? null;
      const billingInterval = billing?.billingInterval ?? null;

      await db
        .insert(events)
        .values({
          organizationId,
          eventType,
          grossValueInCents: grossValue,
          currency: eventCurrency,
          baseCurrency,
          exchangeRate,
          baseGrossValueInCents: baseValueInCents,
          billingType: isRecurring ? "recurring" : "one_time",
          billingReason,
          billingInterval,
          subscriptionId,
          customerId: hashedCustomerId ?? undefined,
          paymentMethod: pm,
          provider: "stripe",
          eventHash: stripeEventHash(organizationId, charge.id),
          createdAt: new Date(charge.created * 1000),
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
            subscriptionId,
            currency: eventCurrency,
            baseCurrency,
            exchangeRate,
            baseGrossValueInCents: baseValueInCents,
            createdAt: new Date(charge.created * 1000),
          },
        });

      if (isRecurring) {
        invoicesSynced++;
      } else {
        oneTimePurchasesSynced++;
      }
    }

    for (const [invoiceId, billing] of invoiceBillingMap.entries()) {
      if (chargedInvoiceIds.has(invoiceId)) continue;

      const hashedCustomerId = billing.rawCustomerId
        ? hashAnonymous(billing.rawCustomerId)
        : undefined;
      const acq = hashedCustomerId
        ? await lookupAcquisitionContext(organizationId, hashedCustomerId)
        : null;

      const { baseCurrency, exchangeRate, baseValueInCents } = await computeBaseValue(
        organizationId,
        billing.currency,
        orgCurrency,
        billing.amountPaid,
      );

      await db
        .insert(events)
        .values({
          organizationId,
          eventType: billing.eventType,
          grossValueInCents: billing.amountPaid,
          currency: billing.currency,
          baseCurrency,
          exchangeRate,
          baseGrossValueInCents: baseValueInCents,
          billingType: billing.isRecurring ? "recurring" : "one_time",
          billingReason: billing.billingReason,
          billingInterval: billing.billingInterval ?? null,
          subscriptionId: billing.subscriptionId,
          customerId: hashedCustomerId,
          paymentMethod: "credit_card",
          provider: "stripe",
          eventHash: stripeEventHash(organizationId, billing.invoiceId),
          createdAt: new Date(),
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
            eventType: billing.eventType,
            billingType: billing.isRecurring ? "recurring" : "one_time",
            billingReason: billing.billingReason,
            billingInterval: billing.billingInterval ?? null,
            subscriptionId: billing.subscriptionId,
            currency: billing.currency,
            baseCurrency,
            exchangeRate,
            baseGrossValueInCents: baseValueInCents,
          },
        });

      if (billing.isRecurring) {
        invoicesSynced++;
      } else {
        oneTimePurchasesSynced++;
      }
    }

    await db
      .update(integrations)
      .set({
        historySyncedAt: new Date(),
        lastSyncedAt: new Date(),
        syncError: null,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integrationId));
  } catch (err) {
    await db
      .update(integrations)
      .set({
        status: "error",
        syncError: String(err),
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integrationId));
    throw err;
  }

  return { subscriptionsSynced, invoicesSynced, oneTimePurchasesSynced };
}
