import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import {
  handleCaktoEvent,
  type CaktoWebhookBody,
} from "@/utils/cakto-webhook-handlers";
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

  let body: CaktoWebhookBody;
  try {
    body = (await req.json()) as CaktoWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  if (integration.providerMeta?.webhookSecret) {
    const expectedSecret = decrypt(integration.providerMeta.webhookSecret);
    const incomingSecret =
      (body as Record<string, unknown>).secret ??
      (body as Record<string, unknown>).webhook_secret ??
      null;
    if (incomingSecret && incomingSecret !== expectedSecret) {
      return new NextResponse("Invalid secret", { status: 401 });
    }
  }

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[cakto-webhook] revenue limit exceeded, skipping event", {
      orgId,
      event: body.event,
    });
    return new NextResponse(null, { status: 200 });
  }

  try {
    await handleCaktoEvent(orgId, body);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[cakto-webhook] inline processing failed, enqueueing retry:", err);
    const jobData: WebhookJobData = {
      provider: "cakto",
      integrationId,
      organizationId: orgId,
      payload: JSON.stringify(body),
    };
    await getWebhookQueue()
      .add(`cakto-retry-${body.id ?? Date.now()}`, jobData)
      .catch((qErr) => {
        console.error("[cakto-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}
