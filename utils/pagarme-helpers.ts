import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { BillingInterval } from "./billing";

export const PAGARME_API_BASE = "https://api.pagar.me/core/v5";

export function pagarmeEventHash(orgId: string, externalId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

export function pagarmeBasicAuthHeader(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export function verifyPagarmeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const clean = signatureHeader.startsWith("sha1=")
    ? signatureHeader.slice(5)
    : signatureHeader.startsWith("sha256=")
      ? signatureHeader.slice(7)
      : signatureHeader;
  const algo = signatureHeader.startsWith("sha256=") ? "sha256" : "sha1";
  const expected = createHmac(algo, secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(clean, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function mapPagarmeChargeStatus(status: string | null | undefined): string {
  if (!status) return "pending";
  const map: Record<string, string> = {
    paid: "paid",
    pending: "pending",
    processing: "pending",
    failed: "past_due",
    refunded: "refunded",
    pending_refund: "refunded",
    chargedback: "past_due",
    overpaid: "paid",
    underpaid: "paid",
  };
  return map[status.toLowerCase()] ?? "pending";
}

export function mapPagarmeSubscriptionStatus(
  status: string | null | undefined,
): "active" | "canceled" | "past_due" | "trialing" {
  if (!status) return "active";
  const map: Record<string, "active" | "canceled" | "past_due" | "trialing"> = {
    active: "active",
    trial: "trialing",
    trialing: "trialing",
    future: "active",
    canceled: "canceled",
    cancelled: "canceled",
    expired: "canceled",
    past_due: "past_due",
  };
  return map[status.toLowerCase()] ?? "active";
}

export function mapPagarmeBillingInterval(
  interval: string | null | undefined,
  intervalCount: number | null | undefined,
): BillingInterval {
  if (!interval) return "monthly";
  const i = interval.toLowerCase();
  const count = intervalCount ?? 1;
  if (i === "week") return "weekly";
  if (i === "year") return "yearly";
  if (i === "month") {
    if (count === 3) return "quarterly";
    if (count === 6) return "semiannual";
    if (count === 12) return "yearly";
  }
  return "monthly";
}

export function mapPagarmePaymentMethod(method: string | null | undefined): string {
  if (!method) return "unknown";
  const map: Record<string, string> = {
    credit_card: "credit_card",
    debit_card: "debit_card",
    boleto: "boleto",
    pix: "pix",
    voucher: "voucher",
    bank_transfer: "transfer",
    cash: "cash",
  };
  return map[method.toLowerCase()] ?? method.toLowerCase();
}

export type PagarmeEventType =
  | "order.paid"
  | "order.payment_failed"
  | "order.canceled"
  | "order.updated"
  | "order.created"
  | "order.closed"
  | "charge.paid"
  | "charge.refunded"
  | "charge.payment_failed"
  | "charge.chargedback"
  | "subscription.created"
  | "subscription.canceled"
  | "subscription.charges_paid"
  | "subscription.charges_payment_failed"
  | "invoice.paid"
  | "invoice.payment_failed";
