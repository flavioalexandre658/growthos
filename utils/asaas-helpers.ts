import { createHash } from "crypto";
import type { BillingInterval } from "./billing";

export function asaasEventHash(orgId: string, paymentId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${paymentId}`)
    .digest("hex")
    .slice(0, 32);
}

export function mapAsaasPaymentStatus(status: string): string {
  const map: Record<string, string> = {
    CONFIRMED: "paid",
    RECEIVED: "paid",
    PENDING: "pending",
    OVERDUE: "past_due",
    REFUNDED: "refunded",
    REFUND_REQUESTED: "refunded",
    CHARGEBACK_REQUESTED: "past_due",
    CHARGEBACK_DISPUTE: "past_due",
    AWAITING_CHARGEBACK_REVERSAL: "past_due",
    DUNNING_REQUESTED: "past_due",
    DUNNING_RECEIVED: "paid",
  };
  return map[status] ?? "pending";
}

export function mapAsaasSubscriptionStatus(
  status: string,
): "active" | "canceled" | "past_due" | "trialing" {
  const map: Record<string, "active" | "canceled"> = {
    ACTIVE: "active",
    INACTIVE: "canceled",
    EXPIRED: "canceled",
  };
  return map[status] ?? "active";
}

export function mapAsaasBillingType(billingType: string): string {
  const map: Record<string, string> = {
    CREDIT_CARD: "credit_card",
    PIX: "pix",
    BOLETO: "boleto",
    TRANSFER: "transfer",
    DEPOSIT: "deposit",
  };
  return map[billingType] ?? billingType.toLowerCase();
}

export function mapAsaasBillingInterval(cycle: string): BillingInterval {
  const map: Record<string, BillingInterval> = {
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    QUARTERLY: "quarterly",
    SEMIANNUALLY: "semiannual",
    YEARLY: "yearly",
  };
  return map[cycle] ?? "monthly";
}
