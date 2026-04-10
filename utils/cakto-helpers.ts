import { createHash } from "crypto";
import type { BillingInterval } from "./billing";

export function caktoEventHash(orgId: string, externalId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

export function mapCaktoEventType(eventType: string | null | undefined): string {
  if (!eventType) return "unknown";
  const lower = eventType.toLowerCase();
  const map: Record<string, string> = {
    purchase_approved: "paid",
    compra_aprovada: "paid",
    refund: "refunded",
    reembolso: "refunded",
    chargeback: "past_due",
    purchase_refused: "past_due",
    compra_recusada: "past_due",
    subscription_created: "subscription_created",
    subscription_canceled: "subscription_canceled",
    subscription_renewed: "renewal",
    subscription_renewal_refused: "past_due",
  };
  return map[lower] ?? "unknown";
}

export function mapCaktoSubscriptionStatus(
  status: string | null | undefined,
): "active" | "canceled" | "past_due" | "trialing" {
  if (!status) return "active";
  const lower = status.toLowerCase();
  if (lower === "active" || lower === "ativa") return "active";
  if (lower === "canceled" || lower === "cancelada") return "canceled";
  if (lower === "overdue" || lower === "atrasada") return "past_due";
  if (lower === "trial" || lower === "teste") return "trialing";
  return "active";
}

export function mapCaktoBillingInterval(
  interval: string | null | undefined,
): BillingInterval {
  if (!interval) return "monthly";
  const lower = interval.toLowerCase();
  if (lower.includes("week") || lower.includes("seman")) return "weekly";
  if (lower.includes("quarter") || lower.includes("trimest")) return "quarterly";
  if (lower.includes("semi") || lower.includes("semest")) return "semiannual";
  if (lower.includes("year") || lower.includes("anual") || lower.includes("ano")) return "yearly";
  return "monthly";
}

export function mapCaktoPaymentMethod(method: string | null | undefined): string {
  if (!method) return "unknown";
  const lower = method.toLowerCase();
  if (lower.includes("credit") || lower.includes("cartao") || lower.includes("crédito")) return "credit_card";
  if (lower.includes("boleto")) return "boleto";
  if (lower.includes("pix")) return "pix";
  return lower;
}
