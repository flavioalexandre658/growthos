import Stripe from "stripe";
import { createHash } from "crypto";
import type { BillingInterval } from "./billing";

export function stripeEventHash(orgId: string, externalId: string): string {
  return createHash("sha256").update(`${orgId}:${externalId}`).digest("hex").slice(0, 32);
}

export function extractSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const newRef = invoice.parent?.subscription_details?.subscription;
  if (newRef) return typeof newRef === "string" ? newRef : newRef.id;

  const legacyRef = (invoice as unknown as Record<string, unknown>).subscription;
  if (!legacyRef) return null;
  if (typeof legacyRef === "string") return legacyRef;
  if (typeof legacyRef === "object" && legacyRef !== null) {
    return (legacyRef as { id: string }).id;
  }
  return null;
}

export function mapBillingInterval(interval: string, intervalCount = 1): BillingInterval {
  if (interval === "year") return "yearly";
  if (interval === "week") return "weekly";
  if (interval === "month") {
    if (intervalCount === 3) return "quarterly";
    if (intervalCount === 6) return "semiannual";
    if (intervalCount === 12) return "yearly";
  }
  return "monthly";
}
