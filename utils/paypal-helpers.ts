import { createHash } from "crypto";
import type { BillingInterval } from "./billing";

export const PAYPAL_API_BASE = "https://api-m.paypal.com";
export const PAYPAL_OAUTH_URL = `${PAYPAL_API_BASE}/v1/oauth2/token`;

export function paypalEventHash(orgId: string, externalId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

export function paypalBasicAuth(clientId: string, secret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`;
}

export async function paypalOAuthToken(
  clientId: string,
  secret: string,
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(PAYPAL_OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: paypalBasicAuth(clientId, secret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  }).catch(() => null);

  if (!res) throw new Error("Não foi possível conectar ao PayPal. Verifique e tente novamente.");
  if (res.status === 401 || res.status === 403) {
    throw new Error("Client ID ou Secret inválidos.");
  }
  if (!res.ok) throw new Error(`PayPal OAuth error (${res.status})`);

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("PayPal não retornou access_token.");
  return { access_token: data.access_token, expires_in: data.expires_in ?? 32400 };
}

export function paypalAuthHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

export async function verifyPayPalWebhook(
  accessToken: string,
  webhookId: string,
  headers: Record<string, string>,
  body: string,
): Promise<boolean> {
  const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: paypalAuthHeaders(accessToken),
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"] ?? "",
      cert_url: headers["paypal-cert-url"] ?? "",
      transmission_id: headers["paypal-transmission-id"] ?? "",
      transmission_sig: headers["paypal-transmission-sig"] ?? "",
      transmission_time: headers["paypal-transmission-time"] ?? "",
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  }).catch(() => null);

  if (!res || !res.ok) return false;
  const data = (await res.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}

export function mapPayPalPaymentStatus(eventType: string): string {
  const map: Record<string, string> = {
    "PAYMENT.CAPTURE.COMPLETED": "paid",
    "PAYMENT.CAPTURE.REFUNDED": "refunded",
    "PAYMENT.CAPTURE.REVERSED": "refunded",
    "PAYMENT.CAPTURE.DENIED": "past_due",
    "CHECKOUT.ORDER.APPROVED": "paid",
    "CHECKOUT.ORDER.COMPLETED": "paid",
  };
  return map[eventType] ?? "pending";
}

export function mapPayPalSubscriptionStatus(
  status: string | null | undefined,
): "active" | "canceled" | "past_due" | "trialing" {
  if (!status) return "active";
  const upper = status.toUpperCase();
  const map: Record<string, "active" | "canceled" | "past_due" | "trialing"> = {
    ACTIVE: "active",
    ACTIVATED: "active",
    APPROVED: "active",
    SUSPENDED: "past_due",
    CANCELLED: "canceled",
    EXPIRED: "canceled",
    CREATED: "trialing",
  };
  return map[upper] ?? "active";
}

export function mapPayPalBillingInterval(
  intervalUnit: string | null | undefined,
): BillingInterval {
  if (!intervalUnit) return "monthly";
  const upper = intervalUnit.toUpperCase();
  const map: Record<string, BillingInterval> = {
    DAY: "weekly",
    WEEK: "weekly",
    MONTH: "monthly",
    YEAR: "yearly",
  };
  return map[upper] ?? "monthly";
}

export function mapPayPalPaymentMethod(method: string | null | undefined): string {
  if (!method) return "unknown";
  const lower = method.toLowerCase();
  if (lower.includes("card") || lower.includes("credit")) return "credit_card";
  if (lower.includes("paypal")) return "paypal";
  if (lower.includes("bank")) return "transfer";
  return lower;
}

export function parsePayPalAmount(amount: { value?: string; currency_code?: string } | null | undefined): {
  cents: number;
  currency: string;
} {
  if (!amount) return { cents: 0, currency: "USD" };
  const cents = Math.round(parseFloat(amount.value ?? "0") * 100);
  return { cents, currency: (amount.currency_code ?? "USD").toUpperCase() };
}
