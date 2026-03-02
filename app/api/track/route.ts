import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, events } from "@/db/schema";
import { checkRateLimit } from "@/utils/rate-limiter";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_PAYLOAD_BYTES = 64 * 1024;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
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

export async function POST(req: NextRequest) {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: "Payload too large" },
      { status: 413, headers: CORS_HEADERS }
    );
  }

  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const rawBody = JSON.stringify(body);
  if (rawBody.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: "Payload too large" },
      { status: 413, headers: CORS_HEADERS }
    );
  }

  const key = toString(body.key);
  const eventType = toString(body.event_type);

  if (!key || !eventType) {
    return NextResponse.json(
      { error: "Missing key or event_type" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!checkRateLimit(key)) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.key, key))
    .limit(1);

  if (!apiKey || !apiKey.isActive) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "API key expired" },
      { status: 401, headers: CORS_HEADERS }
    );
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
    referrer: toString(body.referrer),

    device: toString(body.device),
    customerType: toString(body.customer_type),
    customerId: toString(body.customer_id),
    sessionId: toString(body.session_id),

    metadata: sanitizeMetadata(body.metadata),
  });

  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
