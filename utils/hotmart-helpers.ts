import { createHash } from "crypto";
import type { BillingInterval } from "./billing";

export const HOTMART_API_BASE = "https://developers.hotmart.com";
export const HOTMART_OAUTH_URL = "https://api-sec-vlc.hotmart.com/security/oauth/token";

export interface HotmartOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export function hotmartEventHash(orgId: string, externalId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

export function hotmartBasicToken(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export async function hotmartOAuthToken(
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; expires_in: number }> {
  const basic = hotmartBasicToken(clientId, clientSecret);
  const url = `${HOTMART_OAUTH_URL}?grant_type=client_credentials&client_id=${encodeURIComponent(
    clientId,
  )}&client_secret=${encodeURIComponent(clientSecret)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
  }).catch(() => {
    throw new Error("Não foi possível conectar ao Hotmart. Verifique e tente novamente.");
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("client_id ou client_secret inválidos.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Hotmart OAuth error (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as HotmartOAuthResponse;
  if (!data.access_token) {
    throw new Error("Hotmart não retornou access_token.");
  }
  return {
    access_token: data.access_token,
    expires_in: data.expires_in ?? 86400,
  };
}

export function hotmartAuthHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function mapHotmartSubscriptionStatus(
  status: string | null | undefined,
): "active" | "canceled" | "past_due" | "trialing" {
  if (!status) return "active";
  const upper = status.toUpperCase();
  if (upper === "ACTIVE") return "active";
  if (upper === "STARTED") return "trialing";
  if (upper === "OVERDUE" || upper === "DELAYED") return "past_due";
  if (upper.startsWith("CANCELLED") || upper.startsWith("CANCELED")) return "canceled";
  if (upper === "INACTIVE" || upper === "EXPIRED") return "canceled";
  return "active";
}

export function mapHotmartPurchaseStatus(status: string | null | undefined): string {
  if (!status) return "pending";
  const lower = status.toLowerCase();
  const map: Record<string, string> = {
    approved: "paid",
    completed: "paid",
    canceled: "past_due",
    cancelled: "past_due",
    refunded: "refunded",
    chargeback: "refunded",
    delayed: "past_due",
    expired: "past_due",
    blocked: "past_due",
    billet_printed: "pending",
    dispute: "past_due",
  };
  return map[lower] ?? "pending";
}

export function mapHotmartBillingInterval(
  recurrencyPeriod: string | null | undefined,
): BillingInterval {
  if (!recurrencyPeriod) return "monthly";
  const upper = recurrencyPeriod.toUpperCase();
  const map: Record<string, BillingInterval> = {
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    QUARTERLY: "quarterly",
    SEMIANNUALLY: "semiannual",
    SEMIANNUAL: "semiannual",
    SEMESTRAL: "semiannual",
    YEARLY: "yearly",
    ANNUAL: "yearly",
    ANUAL: "yearly",
  };
  return map[upper] ?? "monthly";
}

export function mapHotmartPaymentMethod(method: string | null | undefined): string {
  if (!method) return "unknown";
  const map: Record<string, string> = {
    BILLET: "boleto",
    CREDIT_CARD: "credit_card",
    PIX: "pix",
    PAYPAL: "paypal",
    GOOGLE_PAY: "google_pay",
    APPLE_PAY: "apple_pay",
  };
  return map[method.toUpperCase()] ?? method.toLowerCase();
}

export type HotmartEventType =
  | "PURCHASE_APPROVED"
  | "PURCHASE_COMPLETE"
  | "PURCHASE_CANCELED"
  | "PURCHASE_REFUNDED"
  | "PURCHASE_CHARGEBACK"
  | "PURCHASE_DELAYED"
  | "PURCHASE_EXPIRED"
  | "PURCHASE_BILLET_PRINTED"
  | "PURCHASE_OUT_OF_SHOPPING_CART"
  | "PURCHASE_PROTEST"
  | "SUBSCRIPTION_CANCELLATION"
  | "UPDATE_SUBSCRIPTION_CHARGE_DATE"
  | "CLUB_FIRST_ACCESS";
