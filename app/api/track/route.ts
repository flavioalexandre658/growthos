import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { createHash } from "crypto";
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

const FINANCIAL_EVENT_TYPES = new Set(["payment", "refund", "renewal"]);

const LIFECYCLE_EVENT_TYPES = new Set([
  "signup",
  "trial_started",
  "subscription_canceled",
  "subscription_changed",
]);

const MAX_PAST_DAYS = 30;

function resolveCreatedAt(payloadTimestamp: string | null): Date {
  if (!payloadTimestamp) return new Date();
  const parsed = new Date(payloadTimestamp);
  if (isNaN(parsed.getTime())) return new Date();
  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  if (diffMs < 0 || diffMs > MAX_PAST_DAYS * 86_400_000) return now;
  return parsed;
}

const DEDUPE_ID_MIN = 3;
const DEDUPE_ID_MAX = 256;

const TRANSACTION_ID_FIELDS = [
  "order_id",
  "transaction_id",
  "invoice_id",
  "payment_intent_id",
  "charge_id",
] as const;

const SUBSCRIPTION_ID_FIELDS = ["subscription_id"] as const;

function sha256Short(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

function computeDedupeIdHash(organizationId: string, dedupeId: string): string {
  return sha256Short(`${organizationId}:${dedupeId}`);
}

function extractTransactionId(body: Record<string, unknown>): string | null {
  for (const field of TRANSACTION_ID_FIELDS) {
    const val = body[field];
    if (val && typeof val === "string" && val.length >= DEDUPE_ID_MIN) return `${field}:${val}`;
  }
  const meta = body.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const metaObj = meta as Record<string, unknown>;
    for (const field of TRANSACTION_ID_FIELDS) {
      const val = metaObj[field];
      if (val && typeof val === "string" && val.length >= DEDUPE_ID_MIN) return `meta.${field}:${val}`;
    }
  }
  return null;
}

function extractLifecycleId(body: Record<string, unknown>): string | null {
  for (const field of SUBSCRIPTION_ID_FIELDS) {
    const val = body[field];
    if (val && typeof val === "string" && val.length >= DEDUPE_ID_MIN) return `${field}:${val}`;
  }
  return null;
}

function computeEventHash(parts: {
  eventType: string;
  customerId: string | null;
  grossValueInCents: number | null;
  productId: string | null;
  subscriptionId: string | null;
  landingPage: string | null;
  timestamp: Date;
}): string {
  const isImportant =
    FINANCIAL_EVENT_TYPES.has(parts.eventType) ||
    LIFECYCLE_EVENT_TYPES.has(parts.eventType);

  const segments: (string | number)[] = [
    parts.eventType,
    parts.customerId ?? "",
    parts.grossValueInCents ?? "",
    parts.productId ?? "",
    parts.subscriptionId ?? "",
    parts.landingPage ?? "",
  ];

  if (!isImportant) {
    segments.push(Math.floor(parts.timestamp.getTime() / (24 * 60 * 60 * 1000)));
  }

  return sha256Short(segments.join("|"));
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
  const createdAt = resolveCreatedAt(toString(body.timestamp));

  const isRetry = body._retried === true;
  const retryAttempt = isRetry ? toInt(body._retry_attempt) : null;
  const rawMeta = sanitizeMetadata(body.metadata);
  const metadata = isRetry
    ? { ...(rawMeta ?? {}), retried: true, retryAttempt }
    : rawMeta;

  const rawDedupeId = toString(body.dedupe_id);

  const dedupeId =
    rawDedupeId &&
    rawDedupeId.length >= DEDUPE_ID_MIN &&
    rawDedupeId.length <= DEDUPE_ID_MAX
      ? rawDedupeId
      : null;

  const isFinancialEvent = FINANCIAL_EVENT_TYPES.has(eventType);
  const isLifecycleEvent = LIFECYCLE_EVENT_TYPES.has(eventType);

  const transactionId =
    !dedupeId && isFinancialEvent
      ? extractTransactionId(body as Record<string, unknown>)
      : null;

  const lifecycleId =
    !dedupeId && isLifecycleEvent
      ? extractLifecycleId(body as Record<string, unknown>)
      : null;

  const missingDedupeOnPayment = isFinancialEvent && !dedupeId && !transactionId;

  const missingSubscriptionId =
    (eventType === "subscription_canceled" || eventType === "subscription_changed") &&
    !dedupeId &&
    !lifecycleId;

  if (missingDedupeOnPayment) {
    console.warn(
      `[GrowthOS] ${eventType} event without dedupe_id or transaction identifier — org: ${apiKey.organizationId}, session: ${toString(body.session_id)}`
    );
  }

  if (missingSubscriptionId) {
    console.warn(
      `[GrowthOS] ${eventType} event without subscription_id — org: ${apiKey.organizationId}, session: ${toString(body.session_id)}`
    );
  }

  let eventHash: string;
  if (dedupeId) {
    eventHash = computeDedupeIdHash(apiKey.organizationId, dedupeId);
  } else if (transactionId) {
    eventHash = computeDedupeIdHash(apiKey.organizationId, `${eventType}:${transactionId}`);
  } else if (lifecycleId) {
    eventHash = computeDedupeIdHash(apiKey.organizationId, `${eventType}:${lifecycleId}`);
  } else {
    eventHash = computeEventHash({
      eventType,
      customerId: toString(body.customer_id),
      grossValueInCents,
      productId: toString(body.product_id),
      subscriptionId: toString(body.subscription_id),
      landingPage: toString(body.landing_page),
      timestamp: eventTimestamp,
    });
  }

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

    metadata,
    eventHash,
    createdAt,
  })
    .onConflictDoNothing({ target: [events.organizationId, events.eventHash] })
    .returning({ id: events.id });

  const responseHeaders: Record<string, string> = {
    ...buildCorsHeaders(origin),
  };

  if (missingDedupeOnPayment) {
    responseHeaders["X-GrowthOS-Warning"] =
      "Financial event without dedupe_id. Deduplication relies on fallback hash. Pass dedupe with a unique transaction ID for reliable dedup.";
  }

  if (missingSubscriptionId) {
    responseHeaders["X-GrowthOS-Warning"] =
      "Subscription lifecycle event without subscription_id. Deduplication relies on fallback daily hash. Pass subscription_id for reliable dedup.";
  }

  if (inserted.length === 0) {
    responseHeaders["X-GrowthOS-Duplicate"] = "true";
    return new NextResponse(null, { status: 204, headers: responseHeaders });
  }

  await handleSubscriptionUpsert(
    apiKey.organizationId,
    eventType,
    body as Record<string, unknown>
  );

  return new NextResponse(null, { status: 204, headers: responseHeaders });
}
