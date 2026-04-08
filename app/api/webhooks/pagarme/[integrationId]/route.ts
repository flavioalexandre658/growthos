import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import {
  handlePagarmeEvent,
  type PagarmeWebhookBody,
} from "@/utils/pagarme-webhook-handlers";
import { verifyPagarmeSignature } from "@/utils/pagarme-helpers";
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
    return new NextResponse("Webhook secret not configured", { status: 400 });
  }

  const rawBody = await req.text();
  const signatureHeader =
    req.headers.get("x-hub-signature") ??
    req.headers.get("x-hub-signature-256") ??
    req.headers.get("x-signature");

  const expectedSecret = decrypt(integration.providerMeta.webhookSecret);
  if (!verifyPagarmeSignature(rawBody, signatureHeader, expectedSecret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: PagarmeWebhookBody;
  try {
    body = JSON.parse(rawBody) as PagarmeWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[pagarme-webhook] revenue limit exceeded, skipping event", {
      orgId,
      event: body.type,
    });
    return new NextResponse(null, { status: 200 });
  }

  try {
    await handlePagarmeEvent(orgId, body);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[pagarme-webhook] inline processing failed, enqueueing retry:", err);
    const jobData: WebhookJobData = {
      provider: "pagarme",
      integrationId,
      organizationId: orgId,
      payload: rawBody,
    };
    await getWebhookQueue()
      .add(`pagarme-retry-${body.id ?? Date.now()}`, jobData)
      .catch((qErr) => {
        console.error("[pagarme-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}
