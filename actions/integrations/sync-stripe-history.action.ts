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

    for await (const invoice of stripe.invoices.list({ limit: 100, status: "paid" })) {
      if (!invoice.amount_paid) continue;

      const rawCustomerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
      const hashedCustomerId = hashAnonymous(rawCustomerId);

      const subscriptionId = extractSubscriptionIdFromInvoice(invoice);
      const isRecurring = !!subscriptionId;
      const billingInterval = isRecurring
        ? (subIntervalMap.get(subscriptionId!) ?? "monthly")
        : undefined;
      const billingReason = invoice.billing_reason ?? null;
      const eventType = isRecurring && billingReason === "subscription_cycle" ? "renewal" : "purchase";

      const acq = await lookupAcquisitionContext(organizationId, hashedCustomerId);

      const eventCurrency = invoice.currency.toUpperCase();
      const { baseCurrency, exchangeRate, baseValueInCents } = await computeBaseValue(
        organizationId,
        eventCurrency,
        orgCurrency,
        invoice.amount_paid,
      );

      await db
        .insert(events)
        .values({
          organizationId,
          eventType,
          grossValueInCents: invoice.amount_paid,
          currency: eventCurrency,
          baseCurrency,
          exchangeRate,
          baseGrossValueInCents: baseValueInCents,
          billingType: isRecurring ? "recurring" : "one_time",
          billingReason,
          billingInterval: billingInterval ?? null,
          subscriptionId,
          customerId: hashedCustomerId,
          paymentMethod: "credit_card",
          provider: "stripe",
          eventHash: stripeEventHash(organizationId, invoice.id),
          createdAt: new Date(invoice.created * 1000),
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
            billingInterval: billingInterval ?? null,
            subscriptionId,
            currency: eventCurrency,
            baseCurrency,
            exchangeRate,
            baseGrossValueInCents: baseValueInCents,
          },
        });

      if (isRecurring) {
        invoicesSynced++;
      } else {
        oneTimePurchasesSynced++;
      }
    }

    for await (const charge of stripe.charges.list({ limit: 100 })) {
      if (charge.status !== "succeeded") continue;
      if ((charge as Stripe.Charge & { invoice?: string | null }).invoice) continue;
      if (!charge.amount) continue;

      const rawCustomerId =
        typeof charge.customer === "string" ? charge.customer : charge.customer?.id ?? null;
      const hashedCustomerId = rawCustomerId ? hashAnonymous(rawCustomerId) : null;

      const acq = hashedCustomerId
        ? await lookupAcquisitionContext(organizationId, hashedCustomerId)
        : null;

      const pm = charge.payment_method_details?.type ?? "credit_card";
      const eventCurrency = charge.currency.toUpperCase();
      const { baseCurrency, exchangeRate, baseValueInCents } = await computeBaseValue(
        organizationId,
        eventCurrency,
        orgCurrency,
        charge.amount,
      );

      await db
        .insert(events)
        .values({
          organizationId,
          eventType: "purchase",
          grossValueInCents: charge.amount,
          currency: eventCurrency,
          baseCurrency,
          exchangeRate,
          baseGrossValueInCents: baseValueInCents,
          billingType: "one_time",
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
            billingType: "one_time",
            currency: eventCurrency,
            baseCurrency,
            exchangeRate,
            baseGrossValueInCents: baseValueInCents,
          },
        });

      oneTimePurchasesSynced++;
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
