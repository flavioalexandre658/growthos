import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import { verifyAbacatePaySignature } from "@/utils/abacatepay-helpers";
import {
  handleAbacatePayEvent,
  type AbacatePayWebhookBody,
} from "@/utils/abacatepay-webhook-handlers";
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

  const rawBody = await req.text();
  let body: AbacatePayWebhookBody;
  try {
    body = JSON.parse(rawBody) as AbacatePayWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  if (integration.providerMeta?.webhookSecret) {
    const secret = decrypt(integration.providerMeta.webhookSecret);
    const signature = req.headers.get("x-webhook-signature");
    if (!verifyAbacatePaySignature(rawBody, signature, secret)) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[abacatepay-webhook] revenue limit exceeded, skipping event", {
      orgId,
      event: body.event,
    });
    return new NextResponse(null, { status: 200 });
  }

  try {
    await handleAbacatePayEvent(orgId, body);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[abacatepay-webhook] inline processing failed, enqueueing retry:", err);
    const jobData: WebhookJobData = {
      provider: "abacatepay",
      integrationId,
      organizationId: orgId,
      payload: rawBody,
    };
    await getWebhookQueue()
      .add(`abacatepay-retry-${body.data?.id ?? Date.now()}`, jobData)
      .catch((qErr) => {
        console.error("[abacatepay-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}
