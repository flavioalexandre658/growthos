import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { isOrgOverRevenueLimit } from "@/utils/check-revenue-limit";
import { invalidateOrgDashboardCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.WEBHOOK_RETRY_SECRET ?? process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { provider, integrationId, organizationId, payload } = body;

  if (!provider || !integrationId || !organizationId || !payload) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (!integration || integration.status === "disconnected") {
    return new NextResponse("Integration not found", { status: 404 });
  }

  if (await isOrgOverRevenueLimit(organizationId)) {
    return new NextResponse("Revenue limit exceeded", { status: 429 });
  }

  const parsed = JSON.parse(payload);

  if (provider === "stripe") {
    const stripe = new Stripe(decrypt(integration.accessToken));
    const { handleStripeEvent } = await import(
      "@/app/api/webhooks/stripe/[integrationId]/route"
    );
    await handleStripeEvent(organizationId, parsed as Stripe.Event, stripe);
  } else if (provider === "asaas") {
    const asaasApiKey = decrypt(integration.accessToken);
    const { handleAsaasEvent } = await import(
      "@/app/api/webhooks/asaas/[integrationId]/route"
    );
    await handleAsaasEvent(organizationId, parsed, asaasApiKey);
  } else if (provider === "kiwify") {
    const { handleKiwifyEvent } = await import(
      "@/utils/kiwify-webhook-handlers"
    );
    await handleKiwifyEvent(organizationId, parsed);
  } else if (provider === "hotmart") {
    const { handleHotmartEvent } = await import(
      "@/utils/hotmart-webhook-handlers"
    );
    await handleHotmartEvent(organizationId, parsed);
  } else if (provider === "mercadopago") {
    const accessToken = decrypt(integration.accessToken);
    const { handleMercadoPagoEvent } = await import(
      "@/utils/mercadopago-webhook-handlers"
    );
    await handleMercadoPagoEvent(organizationId, parsed, accessToken);
  } else if (provider === "pagarme") {
    const { handlePagarmeEvent } = await import(
      "@/utils/pagarme-webhook-handlers"
    );
    await handlePagarmeEvent(organizationId, parsed);
  }

  invalidateOrgDashboardCache(organizationId).catch(() => {});

  return new NextResponse(null, { status: 200 });
}
