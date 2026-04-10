import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { BillingInterval } from "./billing";

export const ABACATEPAY_API_BASE = "https://api.abacatepay.com/v1";

export function abacatepayEventHash(orgId: string, externalId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

export function abacatepayAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export function verifyAbacatePaySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signatureHeader, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function mapAbacatePayEventType(event: string | null | undefined): string {
  if (!event) return "unknown";
  const lower = event.toLowerCase();
  const map: Record<string, string> = {
    "checkout.completed": "paid",
    "checkout.refunded": "refunded",
    "checkout.disputed": "past_due",
    "transparent.completed": "paid",
    "transparent.refunded": "refunded",
    "transparent.disputed": "past_due",
    "subscription.completed": "paid",
    "subscription.cancelled": "subscription_canceled",
    "subscription.renewed": "renewal",
  };
  return map[lower] ?? "unknown";
}

export function mapAbacatePaySubscriptionStatus(
  status: string | null | undefined,
): "active" | "canceled" | "past_due" | "trialing" {
  if (!status) return "active";
  const lower = status.toLowerCase();
  if (lower === "active" || lower === "completed") return "active";
  if (lower === "cancelled" || lower === "canceled") return "canceled";
  if (lower === "disputed" || lower === "overdue") return "past_due";
  return "active";
}

export function mapAbacatePayBillingInterval(
  frequency: string | null | undefined,
): BillingInterval {
  if (!frequency) return "monthly";
  const lower = frequency.toLowerCase();
  if (lower.includes("week") || lower.includes("seman")) return "weekly";
  if (lower.includes("quarter") || lower.includes("trimest")) return "quarterly";
  if (lower.includes("semi") || lower.includes("semest")) return "semiannual";
  if (lower.includes("year") || lower.includes("anual")) return "yearly";
  return "monthly";
}

export function mapAbacatePayPaymentMethod(method: string | null | undefined): string {
  if (!method) return "unknown";
  const lower = method.toLowerCase();
  if (lower.includes("credit") || lower.includes("card")) return "credit_card";
  if (lower.includes("boleto")) return "boleto";
  if (lower.includes("pix")) return "pix";
  return lower;
}
