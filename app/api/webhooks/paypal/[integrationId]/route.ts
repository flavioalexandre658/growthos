import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import {
  handlePayPalEvent,
  type PayPalWebhookBody,
} from "@/utils/paypal-webhook-handlers";
import {
  paypalOAuthToken,
  verifyPayPalWebhook,
} from "@/utils/paypal-helpers";
import { getOAuthAccessToken } from "@/utils/oauth-token-cache";
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
  let body: PayPalWebhookBody;
  try {
    body = JSON.parse(rawBody) as PayPalWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const credJson = decrypt(integration.accessToken);
  const credentials = JSON.parse(credJson) as { clientId: string; secret: string };

  const accessToken = await getOAuthAccessToken(integration, () =>
    paypalOAuthToken(credentials.clientId, credentials.secret),
  );

  const webhookId = integration.providerMeta?.webhookId as string | undefined;
  if (webhookId) {
    const paypalHeaders: Record<string, string> = {
      "paypal-transmission-sig": req.headers.get("paypal-transmission-sig") ?? "",
      "paypal-cert-url": req.headers.get("paypal-cert-url") ?? "",
      "paypal-auth-algo": req.headers.get("paypal-auth-algo") ?? "",
      "paypal-transmission-id": req.headers.get("paypal-transmission-id") ?? "",
      "paypal-transmission-time": req.headers.get("paypal-transmission-time") ?? "",
    };

    const verified = await verifyPayPalWebhook(accessToken, webhookId, paypalHeaders, rawBody);
    if (!verified) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[paypal-webhook] revenue limit exceeded, skipping event", {
      orgId,
      event: body.event_type,
    });
    return new NextResponse(null, { status: 200 });
  }

  try {
    await handlePayPalEvent(orgId, body, accessToken);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[paypal-webhook] inline processing failed, enqueueing retry:", err);
    const jobData: WebhookJobData = {
      provider: "paypal",
      integrationId,
      organizationId: orgId,
      payload: rawBody,
    };
    await getWebhookQueue()
      .add(`paypal-retry-${body.id ?? Date.now()}`, jobData)
      .catch((qErr) => {
        console.error("[paypal-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}
