import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import {
  handleHotmartEvent,
  type HotmartWebhookBody,
} from "@/utils/hotmart-webhook-handlers";
import { isOrgOverRevenueLimit } from "@/utils/check-revenue-limit";
import { invalidateOrgDashboardCache } from "@/lib/cache";
import { getWebhookQueue } from "@/lib/queue";
import type { WebhookJobData } from "@/lib/queue";

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
    return new NextResponse("Hottok not configured", { status: 400 });
  }

  const rawBody = await req.text();
  let body: HotmartWebhookBody;
  try {
    body = JSON.parse(rawBody) as HotmartWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const expectedHottok = decrypt(integration.providerMeta.webhookSecret);
  const incomingHottok =
    body.hottok ??
    req.headers.get("x-hotmart-hottok") ??
    req.headers.get("hottok") ??
    null;

  if (!incomingHottok || incomingHottok !== expectedHottok) {
    return new NextResponse("Invalid hottok", { status: 401 });
  }

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[hotmart-webhook] revenue limit exceeded, skipping event", {
      orgId,
      event: body.event,
    });
    return new NextResponse(null, { status: 200 });
  }

  try {
    await handleHotmartEvent(orgId, body);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[hotmart-webhook] inline processing failed, enqueueing retry:", err);
    const jobData: WebhookJobData = {
      provider: "hotmart",
      integrationId,
      organizationId: orgId,
      payload: rawBody,
    };
    await getWebhookQueue()
      .add(`hotmart-retry-${body.id ?? Date.now()}`, jobData)
      .catch((qErr) => {
        console.error("[hotmart-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}
