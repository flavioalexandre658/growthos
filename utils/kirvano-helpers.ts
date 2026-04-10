import { createHash } from "crypto";
import type { BillingInterval } from "./billing";

export function kirvanoEventHash(orgId: string, externalId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

export function parseKirvanoAmount(raw: string | number | null | undefined): number {
  if (typeof raw === "number") return Math.round(raw * 100);
  if (!raw) return 0;
  const cleaned = String(raw)
    .replace(/R\$\s?/i, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function mapKirvanoStatus(status: string | null | undefined): string {
  if (!status) return "pending";
  const upper = status.toUpperCase();
  const map: Record<string, string> = {
    SALE_APPROVED: "paid",
    APPROVED: "paid",
    SALE_REFUSED: "past_due",
    REFUSED: "past_due",
    SALE_CHARGEBACK: "past_due",
    CHARGEBACK: "past_due",
    REFUNDED: "refunded",
    BANK_SLIP_GENERATED: "pending",
    BANK_SLIP_EXPIRED: "past_due",
    PIX_GENERATED: "pending",
    PIX_EXPIRED: "past_due",
  };
  return map[upper] ?? "pending";
}

export function mapKirvanoSubscriptionStatus(
  status: string | null | undefined,
): "active" | "canceled" | "past_due" | "trialing" {
  if (!status) return "active";
  const upper = status.toUpperCase();
  if (upper === "ACTIVE" || upper === "RECURRING") return "active";
  if (upper === "CANCELED" || upper === "CANCELLED") return "canceled";
  if (upper === "OVERDUE" || upper === "PAST_DUE") return "past_due";
  return "active";
}

export function mapKirvanoBillingInterval(
  interval: string | null | undefined,
): BillingInterval {
  if (!interval) return "monthly";
  const lower = interval.toLowerCase();
  if (lower.includes("week") || lower.includes("seman")) return "weekly";
  if (lower.includes("quarter") || lower.includes("trimest")) return "quarterly";
  if (lower.includes("semi") || lower.includes("semest")) return "semiannual";
  if (lower.includes("year") || lower.includes("anual")) return "yearly";
  return "monthly";
}

export function mapKirvanoPaymentMethod(method: string | null | undefined): string {
  if (!method) return "unknown";
  const lower = method.toLowerCase();
  if (lower.includes("credit") || lower.includes("cartao") || lower.includes("crédito")) return "credit_card";
  if (lower.includes("boleto") || lower.includes("bank_slip")) return "boleto";
  if (lower.includes("pix")) return "pix";
  return lower;
}
