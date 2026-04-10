import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations } from "@/db/schema";

export const dynamic = "force-dynamic";

import { decrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import { handleMonetizzeEvent } from "@/utils/monetizze-webhook-handlers";
import { parseMonetizzeFormBody } from "@/utils/monetizze-helpers";
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
    return new NextResponse("Chave única not configured", { status: 400 });
  }

  const rawBody = await req.text();
  const fields = parseMonetizzeFormBody(rawBody);

  const chaveUnica = fields.get("chave_unica");
  const expectedChave = decrypt(integration.providerMeta.webhookSecret);
  if (!chaveUnica || chaveUnica !== expectedChave) {
    return new NextResponse("Invalid chave_unica", { status: 401 });
  }

  const orgId = integration.organizationId;

  if (await isOrgOverRevenueLimit(orgId)) {
    console.warn("[monetizze-webhook] revenue limit exceeded, skipping event", { orgId });
    return new NextResponse(null, { status: 200 });
  }

  try {
    await handleMonetizzeEvent(orgId, fields);
    invalidateOrgDashboardCache(orgId).catch(() => {});
  } catch (err) {
    console.error("[monetizze-webhook] inline processing failed, enqueueing retry:", err);
    const vendaCodigo = fields.get("venda[codigo]") ?? "";
    const jobData: WebhookJobData = {
      provider: "monetizze",
      integrationId,
      organizationId: orgId,
      payload: rawBody,
    };
    await getWebhookQueue()
      .add(`monetizze-retry-${vendaCodigo || Date.now()}`, jobData)
      .catch((qErr) => {
        console.error("[monetizze-webhook] failed to enqueue retry:", qErr);
      });
  }

  return new NextResponse(null, { status: 200 });
}
