import { createHash } from "crypto";
import type { BillingInterval } from "./billing";

export const KIWIFY_API_BASE = "https://public-api.kiwify.com/v1";
export const KIWIFY_OAUTH_URL = "https://public-api.kiwify.com/v1/oauth/token";

export interface KiwifyOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: string | number;
  scope?: string;
}

export function kiwifyEventHash(orgId: string, externalId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

export async function kiwifyOAuthToken(
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
  }).toString();

  const res = await fetch(KIWIFY_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }).catch(() => {
    throw new Error("Não foi possível conectar ao Kiwify. Verifique e tente novamente.");
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("client_id ou client_secret inválidos.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Kiwify OAuth error (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as KiwifyOAuthResponse;
  if (!data.access_token) {
    throw new Error("Kiwify não retornou access_token.");
  }
  const expiresIn =
    typeof data.expires_in === "string" ? parseInt(data.expires_in, 10) : data.expires_in;
  return {
    access_token: data.access_token,
    expires_in: Number.isFinite(expiresIn) ? expiresIn : 86400,
  };
}

export function kiwifyAuthHeaders(accessToken: string, accountId: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "x-kiwify-account-id": accountId,
  };
}

export function mapKiwifyPaymentMethod(method: string | null | undefined): string {
  if (!method) return "unknown";
  const map: Record<string, string> = {
    credit_card: "credit_card",
    pix: "pix",
    boleto: "boleto",
    debit_card: "debit_card",
  };
  return map[method.toLowerCase()] ?? method.toLowerCase();
}

export function mapKiwifyBillingInterval(frequency: string | null | undefined): BillingInterval {
  if (!frequency) return "monthly";
  const map: Record<string, BillingInterval> = {
    weekly: "weekly",
    monthly: "monthly",
    quarterly: "quarterly",
    semiannually: "semiannual",
    semiannual: "semiannual",
    semestral: "semiannual",
    semestre: "semiannual",
    yearly: "yearly",
    annual: "yearly",
    anual: "yearly",
  };
  return map[frequency.toLowerCase()] ?? "monthly";
}

export function mapKiwifySaleStatus(status: string | null | undefined): string {
  if (!status) return "pending";
  const map: Record<string, string> = {
    paid: "paid",
    approved: "paid",
    refunded: "refunded",
    chargedback: "past_due",
    chargeback: "past_due",
    waiting_payment: "pending",
    pending: "pending",
    refused: "past_due",
    canceled: "past_due",
  };
  return map[status.toLowerCase()] ?? "pending";
}

export type KiwifyEventType =
  | "compra_aprovada"
  | "compra_recusada"
  | "compra_reembolsada"
  | "chargeback"
  | "boleto_gerado"
  | "pix_gerado"
  | "carrinho_abandonado"
  | "subscription_canceled"
  | "subscription_late"
  | "subscription_renewed";
