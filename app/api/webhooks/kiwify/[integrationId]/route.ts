import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import {
  handleKiwifyEvent,
  extractKiwifyEventType,
  type KiwifyWebhookBody,
} from "@/utils/kiwify-webhook-handlers";
import { isOrgOverRevenueLimit } from "@/utils/check-revenue-limit";
import { invalidateOrgDashboardCache } from "@/lib/cache";
import { getWebhookQueue } from "@/lib/queue";
import type { WebhookJobData } from "@/lib/queue";

function extractKiwifyToken(req: NextRequest, body: KiwifyWebhookBody | null): string | null {
  // Token may be delivered as query param ?token=..., header x-kiwify-token, or in body.
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken) return queryToken;
  const headerToken =
    req.headers.get("x-kiwify-token") ??
    req.headers.get("kiwify-token") ??
    req.headers.get("x-kiwify-signature");
  if (headerToken) return headerToken;
  if (body && typeof (body as Record<string, unknown>).token === "string") {
    return (body as Record<string, unknown>).token as string;
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> },
) {
  const { integrationId } = await params;

  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (!integration || integration.status === "disconnected") {
    return new NextResponse("Unknown integration", { status: 400 });
  }

  if (!integration.providerMeta?.webhookSecret) {
    return new NextResponse("Webhook token not configured", { status: 400 });
  }

  const rawBody = await req.text();
  let body: KiwifyWebhookBody;
  try {
    body = JSON.parse(rawBody) as KiwifyWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const token = extractKiwifyToken(req, body);
  const expectedToken = decrypt(integration.providerMeta.webhookSecret);
  if (!token || token !== expectedToken) {
    return new NextResponse("Invalid token", { status: 401 });
  }

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[kiwify-webhook] revenue limit exceeded, skipping event", {
      orgId,
      event: extractKiwifyEventType(body),
    });
    return new NextResponse(null, { status: 200 });
  }

  try {
    await handleKiwifyEvent(orgId, body);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[kiwify-webhook] inline processing failed, enqueueing retry:", err);
    const jobData: WebhookJobData = {
      provider: "kiwify",
      integrationId,
      organizationId: orgId,
      payload: rawBody,
    };
    await getWebhookQueue()
      .add(`kiwify-retry-${body.order_id ?? Date.now()}`, jobData)
      .catch((qErr) => {
        console.error("[kiwify-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}
