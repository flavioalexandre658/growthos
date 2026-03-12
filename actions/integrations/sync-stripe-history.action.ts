"use server";

import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations, events, payments, subscriptions, organizations } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";
import { extractSubscriptionIdFromInvoice, mapBillingInterval, stripeEventHash } from "@/utils/stripe-helpers";
import { resolveExchangeRate } from "@/utils/resolve-exchange-rate";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";
import { insertPayment } from "@/utils/insert-payment";
import { upsertCustomer } from "@/utils/upsert-customer";
import { isOrgOverRevenueLimit } from "@/utils/check-revenue-limit";
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

function extractMetaCustomerId(metadata: Record<string, string> | null | undefined): string | null {
  if (!metadata) return null;
  return metadata.growthos_customer_id ?? metadata.groware_customer_id ?? null;
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

  if (await isOrgOverRevenueLimit(organizationId)) {
    throw new Error("Limite de receita do plano atingido. Faça upgrade para importar dados históricos.");
  }

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

  await db
    .delete(payments)
    .where(
      and(
        eq(payments.organizationId, organizationId),
        eq(payments.provider, "stripe"),
      ),
    );

  let subscriptionsSynced = 0;
  let invoicesSynced = 0;
  let oneTimePurchasesSynced = 0;
  const subIntervalMap = new Map<string, BillingInterval>();

  try {
    for await (const sub of stripe.subscriptions.list({ limit: 100, status: "all" })) {
      const rawCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const metaCustomerId = extractMetaCustomerId(sub.metadata as Record<string, string> | null);
      const customerId = metaCustomerId ?? rawCustomerId;

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
          customerId,
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
      const metaCustomerId = extractMetaCustomerId(
        invoice.metadata as Record<string, string> | null,
      );
      const customerId = metaCustomerId ?? rawCustomerId;

      const acq = customerId ? await lookupAcquisitionContext(organizationId, customerId) : null;

      const subscriptionId = extractSubscriptionIdFromInvoice(invoice);
      const isRecurring = !!subscriptionId;
      const billingInterval = isRecurring
        ? (subIntervalMap.get(subscriptionId!) ?? "monthly")
        : undefined;
      const billingReason = invoice.billing_reason ?? null;
      const eventType =
        isRecurring && billingReason === "subscription_cycle" ? "renewal" : "purchase";
      const paidAt = invoice.status_transitions?.paid_at ?? invoice.created;

      const eventCurrency = invoice.currency.toUpperCase();
      const { baseCurrency, exchangeRate, baseValueInCents } = await computeBaseValue(
        organizationId,
        eventCurrency,
        orgCurrency,
        invoice.amount_paid,
      );

      const eventHash = stripeEventHash(organizationId, invoice.id);

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
          billingInterval: (billingInterval as BillingInterval | undefined) ?? null,
          subscriptionId,
          customerId: customerId || undefined,
          paymentMethod: "credit_card",
          provider: "stripe",
          eventHash,
          createdAt: new Date(paidAt * 1000),
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
            billingInterval: (billingInterval as BillingInterval | undefined) ?? null,
            subscriptionId,
            currency: eventCurrency,
            baseCurrency,
            exchangeRate,
            baseGrossValueInCents: baseValueInCents,
            createdAt: new Date(paidAt * 1000),
          },
        });

      await insertPayment({
        organizationId,
        eventType,
        grossValueInCents: invoice.amount_paid,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents: baseValueInCents,
        billingType: isRecurring ? "recurring" : "one_time",
        billingReason,
        billingInterval: (billingInterval as BillingInterval | undefined) ?? null,
        subscriptionId,
        customerId: customerId || undefined,
        paymentMethod: "credit_card",
        provider: "stripe",
        eventHash,
        createdAt: new Date(paidAt * 1000),
        source: acq?.source ?? null,
        medium: acq?.medium ?? null,
        campaign: acq?.campaign ?? null,
        content: acq?.content ?? null,
        landingPage: acq?.landingPage ?? null,
        entryPage: acq?.entryPage ?? null,
        sessionId: acq?.sessionId ?? null,
      }).catch((err) => {
        console.error("[stripe-sync] insertPayment failed (invoice)", {
          orgId: organizationId,
          eventType,
          eventHash,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      if (isRecurring) {
        invoicesSynced++;
      } else {
        oneTimePurchasesSynced++;
      }

      if (customerId) {
        await upsertCustomer({
          organizationId,
          customerId,
          name: invoice.customer_name ?? null,
          email: invoice.customer_email ?? null,
          eventTimestamp: new Date(paidAt * 1000),
        }).catch(() => {});
      }
    }

    const invoiceLinkedIds = new Set<string>();

    for await (const ip of stripe.invoicePayments.list({ status: "paid" })) {
      const p = ip.payment;
      if (p.type === "payment_intent" && p.payment_intent) {
        const piId = typeof p.payment_intent === "string" ? p.payment_intent : p.payment_intent.id;
        invoiceLinkedIds.add(`pi:${piId}`);
      } else if (p.type === "charge" && p.charge) {
        const chId = typeof p.charge === "string" ? p.charge : p.charge.id;
        invoiceLinkedIds.add(`ch:${chId}`);
      }
    }

    for await (const charge of stripe.charges.list({ limit: 100 })) {
      if (charge.status !== "succeeded") continue;
      if (!charge.amount) continue;

      const chargePaymentIntentId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id ?? null;
      if (chargePaymentIntentId && invoiceLinkedIds.has(`pi:${chargePaymentIntentId}`)) continue;
      if (invoiceLinkedIds.has(`ch:${charge.id}`)) continue;

      const rawCustomerId =
        typeof charge.customer === "string" ? charge.customer : charge.customer?.id ?? null;
      const metaCustomerId = extractMetaCustomerId(
        charge.metadata as Record<string, string> | null,
      );
      const customerId = metaCustomerId ?? rawCustomerId;

      const acq = customerId ? await lookupAcquisitionContext(organizationId, customerId) : null;

      const pm = charge.payment_method_details?.type ?? "credit_card";
      const eventCurrency = charge.currency.toUpperCase();
      const { baseCurrency, exchangeRate, baseValueInCents } = await computeBaseValue(
        organizationId,
        eventCurrency,
        orgCurrency,
        charge.amount,
      );

      const eventHash = stripeEventHash(organizationId, charge.id);

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
          billingReason: null,
          billingInterval: null,
          subscriptionId: null,
          customerId: customerId ?? undefined,
          paymentMethod: pm,
          provider: "stripe",
          eventHash,
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
            currency: eventCurrency,
            baseCurrency,
            exchangeRate,
            baseGrossValueInCents: baseValueInCents,
            createdAt: new Date(charge.created * 1000),
          },
        });

      await insertPayment({
        organizationId,
        eventType: "purchase",
        grossValueInCents: charge.amount,
        currency: eventCurrency,
        baseCurrency,
        exchangeRate,
        baseGrossValueInCents: baseValueInCents,
        billingType: "one_time",
        billingReason: null,
        billingInterval: null,
        subscriptionId: null,
        customerId: customerId ?? undefined,
        paymentMethod: pm,
        provider: "stripe",
        eventHash,
        createdAt: new Date(charge.created * 1000),
        source: acq?.source ?? null,
        medium: acq?.medium ?? null,
        campaign: acq?.campaign ?? null,
        content: acq?.content ?? null,
        landingPage: acq?.landingPage ?? null,
        entryPage: acq?.entryPage ?? null,
        sessionId: acq?.sessionId ?? null,
      }).catch((err) => {
        console.error("[stripe-sync] insertPayment failed (charge)", {
          orgId: organizationId,
          eventType: "purchase",
          eventHash,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      if (customerId) {
        await upsertCustomer({
          organizationId,
          customerId,
          name: charge.billing_details?.name ?? null,
          email: charge.billing_details?.email ?? null,
          phone: charge.billing_details?.phone ?? null,
          eventTimestamp: new Date(charge.created * 1000),
        }).catch(() => {});
      }

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
        syncError: err instanceof Error ? err.message : String(err),
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integrationId));
    throw err;
  }

  return { subscriptionsSynced, invoicesSynced, oneTimePurchasesSynced };
}
