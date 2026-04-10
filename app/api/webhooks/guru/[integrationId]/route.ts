import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import {
  handleGuruEvent,
  type GuruWebhookBody,
} from "@/utils/guru-webhook-handlers";
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
    return new NextResponse("Account token not configured", { status: 400 });
  }

  const rawBody = await req.text();
  let body: GuruWebhookBody;
  try {
    body = JSON.parse(rawBody) as GuruWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const expectedToken = decrypt(integration.providerMeta.webhookSecret);
  if (!body.api_token || body.api_token !== expectedToken) {
    return new NextResponse("Invalid api_token", { status: 401 });
  }

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[guru-webhook] revenue limit exceeded, skipping event", {
      orgId,
      status: body.status,
    });
    return new NextResponse(null, { status: 200 });
  }

  try {
    await handleGuruEvent(orgId, body);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[guru-webhook] inline processing failed, enqueueing retry:", err);
    const jobData: WebhookJobData = {
      provider: "guru",
      integrationId,
      organizationId: orgId,
      payload: rawBody,
    };
    await getWebhookQueue()
      .add(`guru-retry-${body.id ?? Date.now()}`, jobData)
      .catch((qErr) => {
        console.error("[guru-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}
