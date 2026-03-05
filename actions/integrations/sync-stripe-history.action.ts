"use server";

import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { integrations, events, subscriptions } from "@/db/schema";
import { decrypt } from "@/lib/crypto";
import { hashAnonymous } from "@/lib/hash";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";
import type { BillingInterval } from "@/utils/billing";
import { lookupAcquisitionContext } from "@/utils/acquisition-lookup";

function stripeEventHash(orgId: string, externalId: string): string {
  return createHash("sha256").update(`${orgId}:${externalId}`).digest("hex").slice(0, 32);
}

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

function mapBillingInterval(interval: string, intervalCount = 1): BillingInterval {
  if (interval === "year") return "yearly";
  if (interval === "week") return "weekly";
  if (interval === "month") {
    if (intervalCount === 3) return "quarterly";
    if (intervalCount === 6) return "semiannual";
    if (intervalCount === 12) return "yearly";
  }
  return "monthly";
}

export async function syncStripeHistory(
  organizationId: string,
  integrationId: string,
): Promise<{
  subscriptionsSynced: number;
  invoicesSynced: number;
  oneTimePaymentsSynced: number;
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

  let subscriptionsSynced = 0;
  let invoicesSynced = 0;
  let oneTimePaymentsSynced = 0;
  const subIntervalMap = new Map<string, BillingInterval>();

  try {
    for await (const sub of stripe.subscriptions.list({ limit: 100, status: "all" })) {
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const item = sub.items.data[0];
      const interval = item?.price.recurring?.interval ?? "month";
      const intervalCount = item?.price.recurring?.interval_count ?? 1;
      const billingInterval = mapBillingInterval(interval, intervalCount);

      subIntervalMap.set(sub.id, billingInterval);

      await db
        .insert(subscriptions)
        .values({
          organizationId,
          subscriptionId: sub.id,
          customerId: hashAnonymous(customerId),
          planId: item?.price.id ?? "unknown",
          planName: item?.price.nickname ?? item?.price.id ?? "Plano",
          status: mapStripeStatus(sub.status),
          valueInCents: item?.price.unit_amount ?? 0,
          currency: sub.currency.toUpperCase(),
          billingInterval,
          startedAt: new Date(sub.start_date * 1000),
          canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        })
        .onConflictDoUpdate({
          target: [subscriptions.subscriptionId],
          set: {
            status: mapStripeStatus(sub.status),
            canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
            updatedAt: new Date(),
          },
        });

      subscriptionsSynced++;
    }

    const invoiceIdsSynced = new Set<string>();

    for await (const invoice of stripe.invoices.list({ limit: 100, status: "paid" })) {
      if (!invoice.amount_paid) continue;

      const rawCustomerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
      const hashedCustomerId = hashAnonymous(rawCustomerId);

      const subRef = invoice.parent?.subscription_details?.subscription ?? null;
      const subscriptionId = subRef
        ? typeof subRef === "string"
          ? subRef
          : subRef.id
        : null;

      const isRecurring = !!subscriptionId;
      const billingInterval = isRecurring
        ? (subIntervalMap.get(subscriptionId!) ?? "monthly")
        : undefined;

      const acq = await lookupAcquisitionContext(organizationId, hashedCustomerId);

      await db
        .insert(events)
        .values({
          organizationId,
          eventType: "payment",
          grossValueInCents: invoice.amount_paid,
          currency: invoice.currency.toUpperCase(),
          billingType: isRecurring ? "recurring" : "one_time",
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
        .onConflictDoNothing();

      invoiceIdsSynced.add(invoice.id);

      if (isRecurring) {
        invoicesSynced++;
      } else {
        oneTimePaymentsSynced++;
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

      await db
        .insert(events)
        .values({
          organizationId,
          eventType: "payment",
          grossValueInCents: charge.amount,
          currency: charge.currency.toUpperCase(),
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
        .onConflictDoNothing();

      oneTimePaymentsSynced++;
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

  return { subscriptionsSynced, invoicesSynced, oneTimePaymentsSynced };
}
