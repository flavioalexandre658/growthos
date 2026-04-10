import { createHash } from "crypto";
import type { BillingInterval } from "./billing";

export const MONETIZZE_API_BASE = "https://api.monetizze.com.br/2.1";

export function monetizzeEventHash(orgId: string, externalId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

export function monetizzeAuthHeaders(apiKey: string): HeadersInit {
  return { X_CONSUMER_KEY: apiKey };
}

export function parseMonetizzeFormBody(rawBody: string): URLSearchParams {
  return new URLSearchParams(rawBody);
}

export function mapMonetizzeStatus(codigoStatus: string | null | undefined): string {
  if (!codigoStatus) return "pending";
  const map: Record<string, string> = {
    "1": "pending",
    "2": "paid",
    "3": "past_due",
    "4": "refunded",
    "5": "past_due",
    "6": "paid",
    "7": "pending",
    "8": "pending",
    "9": "past_due",
    "10": "pending",
    "11": "pending",
    "12": "past_due",
    Finalizada: "paid",
    Completa: "paid",
    Cancelada: "past_due",
    Devolvida: "refunded",
    Bloqueada: "past_due",
    "Aguardando pagamento": "pending",
    Reembolsada: "refunded",
    Estornada: "refunded",
    "Em recuperação": "pending",
    "Boleto vencido": "past_due",
  };
  return map[codigoStatus] ?? "pending";
}

export function mapMonetizzeSubscriptionStatus(
  status: string | null | undefined,
): "active" | "canceled" | "past_due" | "trialing" {
  if (!status) return "active";
  const lower = status.toLowerCase();
  if (lower === "ativa" || lower === "active") return "active";
  if (lower === "cancelada" || lower === "canceled" || lower === "inativa" || lower === "inactive") return "canceled";
  if (lower === "atrasada" || lower === "overdue" || lower === "suspensa" || lower === "suspended") return "past_due";
  if (lower === "trial" || lower === "teste") return "trialing";
  return "active";
}

export function mapMonetizzeBillingInterval(
  recurrence: string | null | undefined,
): BillingInterval {
  if (!recurrence) return "monthly";
  const lower = recurrence.toLowerCase();
  if (lower.includes("semanal") || lower.includes("week")) return "weekly";
  if (lower.includes("trimest") || lower.includes("quarter")) return "quarterly";
  if (lower.includes("semest") || lower.includes("semi")) return "semiannual";
  if (lower.includes("anual") || lower.includes("year")) return "yearly";
  return "monthly";
}

export function mapMonetizzePaymentMethod(method: string | null | undefined): string {
  if (!method) return "unknown";
  const lower = method.toLowerCase();
  if (lower.includes("cartao") || lower.includes("credit") || lower.includes("crédito")) return "credit_card";
  if (lower.includes("boleto")) return "boleto";
  if (lower.includes("pix")) return "pix";
  if (lower.includes("debito") || lower.includes("debit")) return "debit_card";
  return lower;
}

export function getMonetizzeField(params: URLSearchParams, key: string): string | null {
  return params.get(key) || null;
}

export function getMonetizzeNestedField(
  params: URLSearchParams,
  prefix: string,
  field: string,
): string | null {
  return params.get(`${prefix}[${field}]`) || null;
}
