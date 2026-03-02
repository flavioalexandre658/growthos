import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, events, subscriptions, organizations } from "@/db/schema";
import { checkRateLimit } from "@/utils/rate-limiter";

const MAX_PAYLOAD_BYTES = 64 * 1024;

function buildCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

function jsonError(message: string, status: number, origin: string | null) {
  return new NextResponse(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...buildCorsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

function toCents(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  return isNaN(num) ? null : num;
}

function toString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value).slice(0, 1000);
}

function sanitizeMetadata(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entries = Object.entries(raw as Record<string, unknown>).slice(0, 20);
  const clean: Record<string, unknown> = {};
  for (const [k, v] of entries) {
    if (typeof v === "string") {
      clean[k] = v.slice(0, 500);
    } else if (typeof v === "number" || typeof v === "boolean" || v === null) {
      clean[k] = v;
    }
  }
  return Object.keys(clean).length > 0 ? clean : null;
}

async function handleSubscriptionUpsert(
  organizationId: string,
  eventType: string,
  body: Record<string, unknown>
) {
  const subscriptionId = toString(body.subscription_id);
  if (!subscriptionId) return;

  const billingType = toString(body.billing_type);

  if (eventType === "payment" && billingType === "recurring") {
    const customerId = toString(body.customer_id) ?? "unknown";
    const planId = toString(body.plan_id) ?? "unknown";
    const planName = toString(body.plan_name) ?? "Unknown Plan";
    const billingInterval = toString(body.billing_interval);
    const validInterval = ["monthly", "yearly", "weekly"].includes(billingInterval ?? "")
      ? (billingInterval as "monthly" | "yearly" | "weekly")
      : "monthly";
    const grossValueCents = toCents(body.gross_value) ?? 0;
    const startedAt = body.timestamp
      ? new Date(String(body.timestamp))
      : new Date();

    await db
      .insert(subscriptions)
      .values({
        organizationId,
        subscriptionId,
        customerId,
        planId,
        planName,
        status: "active",
        valueInCents: grossValueCents,
        billingInterval: validInterval,
        startedAt,
      })
      .onConflictDoUpdate({
        target: subscriptions.subscriptionId,
        set: {
          status: "active",
          valueInCents: grossValueCents,
          planId,
          planName,
          updatedAt: new Date(),
        },
      });

    db.update(organizations)
      .set({ hasRecurringRevenue: true })
      .where(
        and(
          eq(organizations.id, organizationId),
          eq(organizations.hasRecurringRevenue, false)
        )
      )
      .execute()
      .catch(() => {});

    return;
  }

  if (eventType === "subscription_canceled") {
    await db
      .update(subscriptions)
      .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(subscriptions.subscriptionId, subscriptionId),
          eq(subscriptions.organizationId, organizationId)
        )
      );
    return;
  }

  if (eventType === "subscription_changed") {
    const planId = toString(body.plan_id) ?? "unknown";
    const planName = toString(body.plan_name) ?? "Unknown Plan";
    const grossValueCents = toCents(body.gross_value) ?? 0;

    await db
      .update(subscriptions)
      .set({
        planId,
        planName,
        valueInCents: grossValueCents,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.subscriptionId, subscriptionId),
          eq(subscriptions.organizationId, organizationId)
        )
      );
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return jsonError("Payload too large", 413, origin);
  }

  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return jsonError("Invalid payload", 400, origin);
  }

  const rawBody = JSON.stringify(body);
  if (rawBody.length > MAX_PAYLOAD_BYTES) {
    return jsonError("Payload too large", 413, origin);
  }

  const key = toString(body.key);
  const eventType = toString(body.event_type);

  if (!key || !eventType) {
    return jsonError("Missing key or event_type", 400, origin);
  }

  if (!checkRateLimit(key)) {
    return jsonError("Rate limit exceeded", 429, origin);
  }

  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.key, key))
    .limit(1);

  if (!apiKey || !apiKey.isActive) {
    return jsonError("Invalid API key", 401, origin);
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return jsonError("API key expired", 401, origin);
  }

  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))
    .execute()
    .catch(() => {});

  await db.insert(events).values({
    organizationId: apiKey.organizationId,
    eventType,

    grossValueInCents: toCents(body.gross_value),
    netValueInCents: toCents(body.net_value),
    discountInCents: toCents(body.discount),
    gatewayFeeInCents: toCents(body.gateway_fee),
    installments: toInt(body.installments),
    paymentMethod: toString(body.payment_method),

    productId: toString(body.product_id),
    productName: toString(body.product_name),
    category: toString(body.category),

    source: toString(body.source),
    medium: toString(body.medium),
    campaign: toString(body.campaign),
    content: toString(body.content),
    landingPage: toString(body.landing_page),
    entryPage: toString(body.entry_page),
    referrer: toString(body.referrer),

    device: toString(body.device),
    customerType: toString(body.customer_type),
    customerId: toString(body.customer_id),
    sessionId: toString(body.session_id),

    billingType: toString(body.billing_type),
    billingInterval: toString(body.billing_interval),
    subscriptionId: toString(body.subscription_id),
    planId: toString(body.plan_id),
    planName: toString(body.plan_name),

    metadata: sanitizeMetadata(body.metadata),
  });

  await handleSubscriptionUpsert(
    apiKey.organizationId,
    eventType,
    body as Record<string, unknown>
  );

  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(origin) });
}
