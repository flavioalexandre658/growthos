import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, integrations } from "@/db/schema";
import { getPublicMetrics } from "@/actions/public/get-public-metrics.action";
import { getPublicMrrHistory } from "@/actions/public/get-public-mrr-history.action";
import { getPublicSankeyData } from "@/actions/public/get-public-sankey.action";
import type { IPublicPageSettings } from "@/db/schema/organization.schema";
import type { IPublicPageData, IPublicMetricValue } from "@/interfaces/public-page.interface";

function maskValue(value: number, showAbsolute: boolean, currency: string, locale: string): IPublicMetricValue {
  if (showAbsolute) {
    return { value };
  }
  const magnitude = Math.floor(value / 1000) * 1000;
  const upper = magnitude + 1000;
  const fmt = (v: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(v / 100);
  return { value: `${fmt(magnitude)} – ${fmt(upper)}`, label: "faixa" };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (!org || !org.publicPageEnabled) {
    return new NextResponse(null, { status: 404 });
  }

  const settings: IPublicPageSettings = org.publicPageSettings ?? {
    showAbsoluteValues: true,
    showMrr: true,
    showSubscribers: true,
    showChurn: true,
    showArpu: false,
    showGrowthChart: true,
    showSankey: true,
  };

  const [stripeIntegration] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(
      eq(integrations.organizationId, org.id),
    )
    .limit(1);

  const verified = !!stripeIntegration;

  const [rawMetrics, mrrHistory, sankeyData] = await Promise.all([
    getPublicMetrics(org.id),
    settings.showGrowthChart ? getPublicMrrHistory(org.id, 12) : null,
    settings.showSankey ? getPublicSankeyData(org.id) : null,
  ]);

  const response: IPublicPageData = {
    org: {
      name: org.name,
      slug: org.slug,
      description: org.publicDescription ?? null,
      verified,
      currency: org.currency,
      locale: org.locale,
      createdAt: org.createdAt.toISOString(),
    },
    metrics: {
      mrr: settings.showMrr
        ? maskValue(rawMetrics.mrr, settings.showAbsoluteValues, org.currency, org.locale)
        : null,
      activeSubscriptions: settings.showSubscribers
        ? {
            value: settings.showAbsoluteValues
              ? rawMetrics.activeSubscriptions
              : rawMetrics.activeSubscriptions > 0
                ? `${Math.floor(rawMetrics.activeSubscriptions / 10) * 10}+`
                : "0",
          }
        : null,
      churnRate: settings.showChurn ? rawMetrics.churnRate : null,
      arpu: settings.showArpu
        ? maskValue(rawMetrics.arpu, settings.showAbsoluteValues, org.currency, org.locale)
        : null,
      mrrGrowthRate: rawMetrics.mrrGrowthRate,
    },
    charts: {
      mrrHistory: mrrHistory ?? null,
      sankey: sankeyData ?? null,
    },
    settings,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
