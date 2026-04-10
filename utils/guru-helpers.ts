import { createHash } from "crypto";
import type { BillingInterval } from "./billing";

export const GURU_API_BASE = "https://digitalmanager.guru/api/v2";

export function guruEventHash(orgId: string, externalId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

export function guruAuthHeaders(userToken: string): HeadersInit {
  return { Authorization: `Bearer ${userToken}` };
}

export function mapGuruTransactionStatus(status: string | null | undefined): string {
  if (!status) return "pending";
  const lower = status.toLowerCase();
  const map: Record<string, string> = {
    approved: "paid",
    aprovada: "paid",
    complete: "paid",
    completa: "paid",
    canceled: "past_due",
    cancelada: "past_due",
    refunded: "refunded",
    reembolsada: "refunded",
    refund_requested: "refunded",
    "reembolso sol.": "refunded",
    complained: "past_due",
    reclamada: "past_due",
    waiting: "pending",
    "ag. pagamento": "pending",
    printed_boleto: "pending",
    "boleto impresso": "pending",
    expired: "past_due",
    expirada: "past_due",
    in_analysis: "pending",
    "em analise": "pending",
    blocked: "past_due",
    bloqueada: "past_due",
    overdue: "past_due",
    atrasada: "past_due",
    recovering: "pending",
    "em recuperacao": "pending",
    rejected: "past_due",
    rejeitada: "past_due",
    trial: "pending",
    scheduled: "pending",
    agendada: "pending",
    abandoned: "past_due",
    abandonada: "past_due",
  };
  return map[lower] ?? "pending";
}

export function mapGuruSubscriptionStatus(
  status: string | null | undefined,
): "active" | "canceled" | "past_due" | "trialing" {
  if (!status) return "active";
  const lower = status.toLowerCase();
  const map: Record<string, "active" | "canceled" | "past_due" | "trialing"> = {
    active: "active",
    ativa: "active",
    canceled: "canceled",
    cancelada: "canceled",
    overdue: "past_due",
    atrasada: "past_due",
    trial: "trialing",
    expired: "canceled",
    expirada: "canceled",
    recovering: "past_due",
    "em recuperacao": "past_due",
  };
  return map[lower] ?? "active";
}

export function mapGuruBillingInterval(chargedEveryDays: number | null | undefined): BillingInterval {
  if (!chargedEveryDays) return "monthly";
  if (chargedEveryDays <= 7) return "weekly";
  if (chargedEveryDays <= 31) return "monthly";
  if (chargedEveryDays <= 93) return "quarterly";
  if (chargedEveryDays <= 186) return "semiannual";
  return "yearly";
}

export function mapGuruPaymentMethod(method: string | null | undefined): string {
  if (!method) return "unknown";
  const lower = method.toLowerCase();
  const map: Record<string, string> = {
    credit_card: "credit_card",
    "cartão de crédito": "credit_card",
    billet: "boleto",
    boleto: "boleto",
    pix: "pix",
    paypal: "paypal",
    debit_card: "debit_card",
  };
  return map[lower] ?? lower;
}
