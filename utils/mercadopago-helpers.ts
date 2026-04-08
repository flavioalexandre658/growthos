import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { BillingInterval } from "./billing";

export const MERCADOPAGO_API_BASE = "https://api.mercadopago.com";

export function mercadopagoEventHash(orgId: string, externalId: string): string {
  return createHash("sha256")
    .update(`${orgId}:${externalId}`)
    .digest("hex")
    .slice(0, 32);
}

export function mpAuthHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function fetchMercadoPagoResource<T>(
  path: string,
  accessToken: string,
): Promise<T | null> {
  const url = path.startsWith("http") ? path : `${MERCADOPAGO_API_BASE}${path}`;
  const res = await fetch(url, { headers: mpAuthHeaders(accessToken) });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export function parseMPSignatureHeader(
  header: string | null,
): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts = header.split(",").map((p) => p.trim());
  let ts: string | null = null;
  let v1: string | null = null;
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    if (k === "ts") ts = v;
    if (k === "v1") v1 = v;
  }
  if (!ts || !v1) return null;
  return { ts, v1 };
}

export function verifyMercadoPagoSignature(
  signatureHeader: string | null,
  requestIdHeader: string | null,
  dataId: string | null,
  secret: string,
): boolean {
  const parsed = parseMPSignatureHeader(signatureHeader);
  if (!parsed) return false;
  if (!dataId || !requestIdHeader) return false;

  const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${parsed.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(parsed.v1, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function mapMercadoPagoPaymentStatus(status: string | null | undefined): string {
  if (!status) return "pending";
  const map: Record<string, string> = {
    approved: "paid",
    authorized: "paid",
    in_process: "pending",
    in_mediation: "pending",
    pending: "pending",
    rejected: "past_due",
    cancelled: "past_due",
    refunded: "refunded",
    charged_back: "past_due",
  };
  return map[status.toLowerCase()] ?? "pending";
}

export function mapMercadoPagoPreapprovalStatus(
  status: string | null | undefined,
): "active" | "canceled" | "past_due" | "trialing" {
  if (!status) return "active";
  const map: Record<string, "active" | "canceled" | "past_due" | "trialing"> = {
    authorized: "active",
    paused: "past_due",
    cancelled: "canceled",
    pending: "trialing",
    finished: "canceled",
  };
  return map[status.toLowerCase()] ?? "active";
}

export function mapMercadoPagoBillingInterval(
  frequencyType: string | null | undefined,
  frequency: number | null | undefined,
): BillingInterval {
  if (!frequencyType) return "monthly";
  const type = frequencyType.toLowerCase();
  const count = frequency ?? 1;
  if (type === "days") {
    if (count === 7) return "weekly";
    if (count === 30) return "monthly";
    if (count === 90) return "quarterly";
    if (count === 180) return "semiannual";
    if (count === 365) return "yearly";
  }
  if (type === "months") {
    if (count === 1) return "monthly";
    if (count === 3) return "quarterly";
    if (count === 6) return "semiannual";
    if (count === 12) return "yearly";
  }
  return "monthly";
}

export function mapMercadoPagoPaymentMethod(paymentTypeId: string | null | undefined): string {
  if (!paymentTypeId) return "unknown";
  const map: Record<string, string> = {
    credit_card: "credit_card",
    debit_card: "debit_card",
    ticket: "boleto",
    bank_transfer: "pix",
    digital_currency: "pix",
    account_money: "account_money",
    prepaid_card: "prepaid_card",
    atm: "atm",
  };
  return map[paymentTypeId.toLowerCase()] ?? paymentTypeId.toLowerCase();
}

export interface MPPayment {
  id: number | string;
  status: string;
  status_detail?: string;
  date_created: string;
  date_approved?: string | null;
  transaction_amount: number;
  currency_id: string;
  description?: string | null;
  external_reference?: string | null;
  metadata?: Record<string, unknown> | null;
  payer?: {
    id?: string | number | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: { area_code?: string | null; number?: string | null } | null;
    identification?: { type?: string | null; number?: string | null } | null;
  } | null;
  payment_type_id?: string | null;
  payment_method_id?: string | null;
  refunds?: Array<{ id: number; amount: number }> | null;
  order?: { id?: string | number | null; type?: string | null } | null;
  metadata_preapproval_id?: string | null;
}

export interface MPPreapproval {
  id: string;
  status: string;
  reason?: string | null;
  external_reference?: string | null;
  payer_id?: number | null;
  payer_email?: string | null;
  date_created?: string | null;
  last_modified?: string | null;
  auto_recurring?: {
    frequency?: number | null;
    frequency_type?: string | null;
    transaction_amount?: number | null;
    currency_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
}

export interface MPAuthorizedPayment {
  id: number | string;
  preapproval_id: string;
  transaction_amount: number;
  currency_id: string;
  status: string;
  payment?: { id?: number | string | null; status?: string | null } | null;
  date_created?: string;
  payment_date?: string | null;
}

export interface MPWebhookBody {
  id?: number | string;
  type?: string;
  action?: string;
  date_created?: string;
  user_id?: number;
  api_version?: string;
  live_mode?: boolean;
  data?: { id?: string | number };
}
