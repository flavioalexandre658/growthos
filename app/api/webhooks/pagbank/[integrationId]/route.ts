import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import {
  handlePagBankEvent,
  type PagBankWebhookBody,
} from "@/utils/pagbank-webhook-handlers";
import { verifyPagBankSignature } from "@/utils/pagbank-helpers";
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
  let body: PagBankWebhookBody;
  try {
    body = JSON.parse(rawBody) as PagBankWebhookBody;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  if (integration.providerMeta?.webhookSecret) {
    const signatureHeader = req.headers.get("x-authenticity-token");
    const token = decrypt(integration.providerMeta.webhookSecret);
    if (signatureHeader && !verifyPagBankSignature(rawBody, signatureHeader, token)) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[pagbank-webhook] revenue limit exceeded, skipping event", { orgId });
    return new NextResponse(null, { status: 200 });
  }

  try {
    await handlePagBankEvent(orgId, body);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[pagbank-webhook] inline processing failed, enqueueing retry:", err);
    const jobData: WebhookJobData = {
      provider: "pagbank",
      integrationId,
      organizationId: orgId,
      payload: rawBody,
    };
    await getWebhookQueue()
      .add(`pagbank-retry-${body.id ?? Date.now()}`, jobData)
      .catch((qErr) => {
        console.error("[pagbank-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}
