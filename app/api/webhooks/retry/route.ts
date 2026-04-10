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
  } else if (provider === "monetizze") {
    const { handleMonetizzeEvent } = await import(
      "@/utils/monetizze-webhook-handlers"
    );
    const { parseMonetizzeFormBody } = await import(
      "@/utils/monetizze-helpers"
    );
    const fields = typeof parsed === "string" ? parseMonetizzeFormBody(parsed) : new URLSearchParams();
    await handleMonetizzeEvent(organizationId, fields);
  } else if (provider === "pagbank") {
    const { handlePagBankEvent } = await import(
      "@/utils/pagbank-webhook-handlers"
    );
    await handlePagBankEvent(organizationId, parsed);
  } else if (provider === "guru") {
    const { handleGuruEvent } = await import(
      "@/utils/guru-webhook-handlers"
    );
    await handleGuruEvent(organizationId, parsed);
  } else if (provider === "paypal") {
    const credJson = decrypt(integration.accessToken);
    const creds = JSON.parse(credJson) as { clientId: string; secret: string };
    const { getOAuthAccessToken } = await import("@/utils/oauth-token-cache");
    const { paypalOAuthToken } = await import("@/utils/paypal-helpers");
    const token = await getOAuthAccessToken(integration, () =>
      paypalOAuthToken(creds.clientId, creds.secret),
    );
    const { handlePayPalEvent } = await import("@/utils/paypal-webhook-handlers");
    await handlePayPalEvent(organizationId, parsed, token);
  } else if (provider === "eduzz") {
    const { handleEduzzEvent } = await import("@/utils/eduzz-webhook-handlers");
    await handleEduzzEvent(organizationId, parsed);
  } else if (provider === "cakto") {
    const { handleCaktoEvent } = await import(
      "@/utils/cakto-webhook-handlers"
    );
    await handleCaktoEvent(organizationId, parsed);
  } else if (provider === "kirvano") {
    const { handleKirvanoEvent } = await import(
      "@/utils/kirvano-webhook-handlers"
    );
    await handleKirvanoEvent(organizationId, parsed);
  } else if (provider === "abacatepay") {
    const { handleAbacatePayEvent } = await import(
      "@/utils/abacatepay-webhook-handlers"
    );
    await handleAbacatePayEvent(organizationId, parsed);
  }

  invalidateOrgDashboardCache(organizationId).catch(() => {});

  return new NextResponse(null, { status: 200 });
}
