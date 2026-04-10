import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import {
  handleKirvanoEvent,
  type KirvanoWebhookBody,
} from "@/utils/kirvano-webhook-handlers";
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

  let body: KirvanoWebhookBody;
  try {
    body = (await req.json()) as KirvanoWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  if (integration.providerMeta?.webhookSecret) {
    const expectedToken = decrypt(integration.providerMeta.webhookSecret);
    const incomingToken =
      (body as Record<string, unknown>).token ??
      req.headers.get("x-token") ??
      null;
    if (incomingToken && incomingToken !== expectedToken) {
      return new NextResponse("Invalid token", { status: 401 });
    }
  }

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[kirvano-webhook] revenue limit exceeded, skipping event", {
      orgId,
      status: body.status,
    });
    return new NextResponse(null, { status: 200 });
  }

  try {
    await handleKirvanoEvent(orgId, body);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[kirvano-webhook] inline processing failed, enqueueing retry:", err);
    const jobData: WebhookJobData = {
      provider: "kirvano",
      integrationId,
      organizationId: orgId,
      payload: JSON.stringify(body),
    };
    await getWebhookQueue()
      .add(`kirvano-retry-${body.sale_id ?? Date.now()}`, jobData)
      .catch((qErr) => {
        console.error("[kirvano-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}
