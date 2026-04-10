import { createHash, timingSafeEqual } from "crypto";
import type { BillingInterval } from "./billing";

export const PAGBANK_API_BASE = "https://api.pagseguro.com";

export function pagbankEventHash(orgId: string, externalId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

export function pagbankAuthHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function verifyPagBankSignature(
  rawBody: string,
  signatureHeader: string | null,
  token: string,
): boolean {
  if (!signatureHeader) return false;
  const expected = createHash("sha256")
    .update(`${token}-${rawBody}`)
    .digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signatureHeader, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function mapPagBankChargeStatus(status: string | null | undefined): string {
  if (!status) return "pending";
  const upper = status.toUpperCase();
  const map: Record<string, string> = {
    PAID: "paid",
    AUTHORIZED: "paid",
    IN_ANALYSIS: "pending",
    DECLINED: "past_due",
    CANCELED: "past_due",
    WAITING: "pending",
    AVAILABLE: "paid",
  };
  return map[upper] ?? "pending";
}

export function mapPagBankSubscriptionStatus(
  status: string | null | undefined,
): "active" | "canceled" | "past_due" | "trialing" {
  if (!status) return "active";
  const upper = status.toUpperCase();
  if (upper === "ACTIVE") return "active";
  if (upper === "CANCELED" || upper === "SUSPENDED") return "canceled";
  if (upper === "PENDING" || upper === "OVERDUE") return "past_due";
  if (upper === "TRIAL") return "trialing";
  return "active";
}

export function mapPagBankPaymentMethod(method: string | null | undefined): string {
  if (!method) return "unknown";
  const upper = method.toUpperCase();
  const map: Record<string, string> = {
    CREDIT_CARD: "credit_card",
    DEBIT_CARD: "debit_card",
    BOLETO: "boleto",
    PIX: "pix",
    BANK_TRANSFER: "transfer",
  };
  return map[upper] ?? method.toLowerCase();
}

export function mapPagBankBillingInterval(
  interval: string | null | undefined,
): BillingInterval {
  if (!interval) return "monthly";
  const upper = interval.toUpperCase();
  const map: Record<string, BillingInterval> = {
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    BIMONTHLY: "monthly",
    QUARTERLY: "quarterly",
    SEMIANNUALLY: "semiannual",
    YEARLY: "yearly",
    ANNUAL: "yearly",
  };
  return map[upper] ?? "monthly";
}
