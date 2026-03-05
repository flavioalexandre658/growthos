import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, events, subscriptions, organizations, pageviewAggregates } from "@/db/schema";
import { resolveExchangeRate as resolveRate } from "@/utils/resolve-exchange-rate";
import { checkRateLimit } from "@/utils/rate-limiter";
import dayjs from "@/utils/dayjs";

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

function computeEventHash(parts: {
  eventType: string;
  customerId: string | null;
  grossValueInCents: number | null;
  productId: string | null;
  subscriptionId: string | null;
  timestamp: Date;
}): string {
  const bucket = Math.floor(parts.timestamp.getTime() / (5 * 60 * 1000));
  const raw = [
    parts.eventType,
    parts.customerId ?? "",
    parts.grossValueInCents ?? "",
    parts.productId ?? "",
    parts.subscriptionId ?? "",
    bucket,
  ].join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  }
  return h.toString(36);
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

async function handlePageview(
  organizationId: string,
  body: Record<string, unknown>,
  tz: string
) {
  const sessionId = toString(body.session_id) ?? "unknown";
  const localDate = dayjs().tz(tz).format("YYYY-MM-DD");

  await db
    .insert(pageviewAggregates)
    .values({
      organizationId,
      date: localDate,
      sessionId,
      landingPage: toString(body.landing_page),
      entryPage: toString(body.entry_page),
      source: toString(body.source),
      medium: toString(body.medium),
      campaign: toString(body.campaign),
      content: toString(body.content),
      device: toString(body.device),
      referrer: toString(body.referrer),
      pageviews: 1,
    })
    .onConflictDoUpdate({
      target: [
        pageviewAggregates.organizationId,
        pageviewAggregates.date,
        pageviewAggregates.sessionId,
        pageviewAggregates.landingPage,
      ],
      set: {
        pageviews: sql`${pageviewAggregates.pageviews} + 1`,
      },
    });
}

async function resolveExchangeRate(
  organizationId: string,
  fromCurrency: string,
  toCurrency: string,
  origin: string | null
): Promise<{ rate: number } | NextResponse> {
  const rate = await resolveRate(organizationId, fromCurrency, toCurrency);

  if (rate === null) {
    return jsonError(
      `Exchange rate ${fromCurrency}→${toCurrency} not configured. Set it in Settings → Exchange Rates.`,
      400,
      origin,
    );
  }

  return { rate };
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

  const [org] = await db
    .select({
      timezone: organizations.timezone,
      currency: organizations.currency,
    })
    .from(organizations)
    .where(eq(organizations.id, apiKey.organizationId))
    .limit(1);

  const orgTimezone = org?.timezone ?? "America/Sao_Paulo";
  const orgCurrency = org?.currency ?? "BRL";

  if (eventType === "pageview") {
    await handlePageview(
      apiKey.organizationId,
      body as Record<string, unknown>,
      orgTimezone
    );

    return new NextResponse(null, { status: 204, headers: buildCorsHeaders(origin) });
  }

  const grossValueInCents = toCents(body.gross_value);
  const eventCurrency = (toString(body.currency) ?? orgCurrency).toUpperCase();

  let baseGrossValueInCents: number | null = null;
  let resolvedRate = 1;

  if (grossValueInCents !== null) {
    const rateResult = await resolveExchangeRate(
      apiKey.organizationId,
      eventCurrency,
      orgCurrency,
      origin,
    );

    if (rateResult instanceof NextResponse) return rateResult;

    resolvedRate = rateResult.rate;
    baseGrossValueInCents = Math.round(grossValueInCents * resolvedRate);
  }

  const discountInCents = toCents(body.discount);
  const baseNetValueInCents =
    baseGrossValueInCents !== null && discountInCents !== null
      ? baseGrossValueInCents - Math.round(discountInCents * resolvedRate)
      : baseGrossValueInCents;

  const eventTimestamp = body.timestamp ? new Date(String(body.timestamp)) : new Date();
  const eventHash = computeEventHash({
    eventType,
    customerId: toString(body.customer_id),
    grossValueInCents,
    productId: toString(body.product_id),
    subscriptionId: toString(body.subscription_id),
    timestamp: eventTimestamp,
  });

  const inserted = await db.insert(events).values({
    organizationId: apiKey.organizationId,
    eventType,

    currency: eventCurrency,
    baseCurrency: orgCurrency,
    exchangeRate: resolvedRate,

    grossValueInCents,
    baseGrossValueInCents,
    baseNetValueInCents,
    discountInCents,
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
    eventHash,
  })
    .onConflictDoNothing({ target: [events.organizationId, events.eventHash] })
    .returning({ id: events.id });

  if (inserted.length === 0) {
    return new NextResponse(null, {
      status: 204,
      headers: { ...buildCorsHeaders(origin), "X-GrowthOS-Duplicate": "true" },
    });
  }

  await handleSubscriptionUpsert(
    apiKey.organizationId,
    eventType,
    body as Record<string, unknown>
  );

  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(origin) });
}
