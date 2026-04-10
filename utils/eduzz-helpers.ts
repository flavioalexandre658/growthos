import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { BillingInterval } from "./billing";

export const EDUZZ_API_BASE = "https://api2.eduzz.com";

export function eduzzEventHash(orgId: string, externalId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyEduzzSignature(
  rawBody: string,
  signatureHeader: string | null,
  secretKey: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secretKey).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signatureHeader, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function mapEduzzTransactionStatus(status: string | number | null | undefined): string {
  if (!status) return "pending";
  const map: Record<string, string> = {
    "1": "pending",
    "3": "paid",
    "4": "past_due",
    "6": "pending",
    "7": "refunded",
    "10": "past_due",
    "15": "pending",
    open: "pending",
    paid: "paid",
    canceled: "past_due",
    awaiting_refund: "pending",
    refunded: "refunded",
    expired: "past_due",
    waiting_payment: "pending",
    invoice_paid: "paid",
    invoice_canceled: "past_due",
    invoice_expired: "past_due",
    invoice_refunded: "refunded",
    invoice_recovering: "pending",
  };
  return map[String(status).toLowerCase()] ?? "pending";
}

export function mapEduzzSubscriptionStatus(
  status: string | number | null | undefined,
): "active" | "canceled" | "past_due" | "trialing" {
  if (!status) return "active";
  const map: Record<string, "active" | "canceled" | "past_due" | "trialing"> = {
    "1": "active",
    "2": "past_due",
    "3": "past_due",
    "4": "canceled",
    "7": "past_due",
    up_to_date: "active",
    current: "active",
    waiting_payment: "past_due",
    suspended: "past_due",
    canceled: "canceled",
    overdue: "past_due",
    contract_up_to_date: "active",
    contract_waiting_payment: "past_due",
    contract_suspended: "past_due",
    contract_canceled: "canceled",
    contract_overdue: "past_due",
  };
  return map[String(status).toLowerCase()] ?? "active";
}

export function mapEduzzBillingInterval(
  intervalType: string | null | undefined,
  interval: number | null | undefined,
): BillingInterval {
  if (!intervalType) return "monthly";
  const lower = intervalType.toLowerCase();
  const count = interval ?? 1;
  if (lower.includes("day") || lower.includes("dia")) {
    if (count <= 7) return "weekly";
    if (count <= 31) return "monthly";
    if (count <= 93) return "quarterly";
    return "yearly";
  }
  if (lower.includes("week") || lower.includes("seman")) return "weekly";
  if (lower.includes("month") || lower.includes("mes") || lower.includes("mês")) {
    if (count === 3) return "quarterly";
    if (count === 6) return "semiannual";
    if (count === 12) return "yearly";
    return "monthly";
  }
  if (lower.includes("year") || lower.includes("ano")) return "yearly";
  return "monthly";
}

export function mapEduzzPaymentMethod(method: string | null | undefined): string {
  if (!method) return "unknown";
  const lower = method.toLowerCase();
  if (lower.includes("cartao") || lower.includes("card") || lower.includes("crédito")) return "credit_card";
  if (lower.includes("boleto")) return "boleto";
  if (lower.includes("pix")) return "pix";
  if (lower.includes("debito") || lower.includes("debit")) return "debit_card";
  return lower;
}
