import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import {
  handleMercadoPagoEvent,
  type MPWebhookBody,
} from "@/utils/mercadopago-webhook-handlers";
import { verifyMercadoPagoSignature } from "@/utils/mercadopago-helpers";
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
  let body: MPWebhookBody;
  try {
    body = JSON.parse(rawBody) as MPWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const url = new URL(req.url);
  const dataIdFromBody = body.data?.id ? String(body.data.id) : null;
  const dataIdFromQuery = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const dataId = dataIdFromBody ?? dataIdFromQuery;

  const signatureHeader = req.headers.get("x-signature");
  const requestIdHeader = req.headers.get("x-request-id");
  const expectedSecret = decrypt(integration.providerMeta.webhookSecret);

  if (
    !verifyMercadoPagoSignature(signatureHeader, requestIdHeader, dataId, expectedSecret)
  ) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  if (!dataId) {
    return new NextResponse("Missing data.id", { status: 400 });
  }

  if (!body.data) body.data = { id: dataId };

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[mercadopago-webhook] revenue limit exceeded, skipping event", {
      orgId,
      type: body.type,
    });
    return new NextResponse(null, { status: 200 });
  }

  const accessToken = decrypt(integration.accessToken);

  try {
    await handleMercadoPagoEvent(orgId, body, accessToken);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[mercadopago-webhook] inline processing failed, enqueueing retry:", err);
    const jobData: WebhookJobData = {
      provider: "mercadopago",
      integrationId,
      organizationId: orgId,
      payload: rawBody,
    };
    await getWebhookQueue()
      .add(`mercadopago-retry-${dataId}`, jobData)
      .catch((qErr) => {
        console.error("[mercadopago-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}
