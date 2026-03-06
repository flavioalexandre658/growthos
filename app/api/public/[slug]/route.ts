import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations, integrations } from "@/db/schema";
import { getPublicMetrics } from "@/actions/public/get-public-metrics.action";
import { getPublicMrrHistory } from "@/actions/public/get-public-mrr-history.action";
import { getPublicSankeyData } from "@/actions/public/get-public-sankey.action";
import { getPublicRevenueMetrics } from "@/actions/public/get-public-revenue-metrics.action";
import { getPublicRevenueHistory } from "@/actions/public/get-public-revenue-history.action";
import { DEFAULT_PUBLIC_PAGE_SETTINGS } from "@/db/schema/organization.schema";
import type { IPublicPageSettings } from "@/db/schema/organization.schema";
import type { IPublicPageData, IPublicMetricValue, BusinessMode } from "@/interfaces/public-page.interface";

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

function detectBusinessMode(hasRecurringRevenue: boolean, oneTimeRevenue: number, recurringRevenue: number): BusinessMode {
  if (!hasRecurringRevenue) return "one_time";
  if (oneTimeRevenue === 0) return "recurring";
  const ratio = oneTimeRevenue / (recurringRevenue + oneTimeRevenue);
  return ratio > 0.3 ? "hybrid" : "recurring";
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

  const settings: IPublicPageSettings = {
    ...DEFAULT_PUBLIC_PAGE_SETTINGS,
    ...(org.publicPageSettings ?? {}),
  };

  const [stripeIntegration] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(eq(integrations.organizationId, org.id))
    .limit(1);

  const verified = !!stripeIntegration;

  const revenueMetrics = await getPublicRevenueMetrics(org.id);

  const businessMode = detectBusinessMode(
    org.hasRecurringRevenue,
    revenueMetrics.oneTimeRevenue,
    revenueMetrics.recurringRevenue,
  );

  const needsMrr = businessMode === "recurring" || businessMode === "hybrid";
  const needsRevenue = businessMode === "one_time" || businessMode === "hybrid";

  const [rawMetrics, mrrHistory, revenueHistory, sankeyData] = await Promise.all([
    needsMrr ? getPublicMetrics(org.id) : null,
    needsMrr && settings.showGrowthChart ? getPublicMrrHistory(org.id, 12) : null,
    needsRevenue && settings.showGrowthChart ? getPublicRevenueHistory(org.id, 12) : null,
    needsMrr && settings.showSankey ? getPublicSankeyData(org.id) : null,
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
    businessMode,
    metrics: {
      mrr: needsMrr && rawMetrics && settings.showMrr
        ? maskValue(rawMetrics.mrr, settings.showAbsoluteValues, org.currency, org.locale)
        : null,
      activeSubscriptions: needsMrr && rawMetrics && settings.showSubscribers
        ? {
            value: settings.showAbsoluteValues
              ? rawMetrics.activeSubscriptions
              : rawMetrics.activeSubscriptions > 0
                ? `${Math.floor(rawMetrics.activeSubscriptions / 10) * 10}+`
                : "0",
          }
        : null,
      churnRate: needsMrr && rawMetrics && settings.showChurn ? rawMetrics.churnRate : null,
      arpu: needsMrr && rawMetrics && settings.showArpu
        ? maskValue(rawMetrics.arpu, settings.showAbsoluteValues, org.currency, org.locale)
        : null,
      mrrGrowthRate: needsMrr && rawMetrics ? rawMetrics.mrrGrowthRate : null,

      monthlyRevenue: needsRevenue && settings.showRevenue
        ? maskValue(revenueMetrics.monthlyRevenue, settings.showAbsoluteValues, org.currency, org.locale)
        : null,
      revenueGrowthRate: needsRevenue ? revenueMetrics.revenueGrowthRate : null,
      uniqueCustomers: needsRevenue && settings.showRevenue
        ? { value: revenueMetrics.uniqueCustomers }
        : null,
      ticketMedio: needsRevenue && settings.showTicketMedio
        ? maskValue(revenueMetrics.ticketMedio, settings.showAbsoluteValues, org.currency, org.locale)
        : null,
      repurchaseRate: needsRevenue && settings.showRepurchaseRate
        ? revenueMetrics.repurchaseRate
        : null,
      revenueSplit: businessMode === "hybrid" && settings.showRevenueSplit
        ? { recurring: revenueMetrics.recurringRevenue, oneTime: revenueMetrics.oneTimeRevenue }
        : null,
    },
    charts: {
      mrrHistory: mrrHistory ?? null,
      revenueHistory: revenueHistory ?? null,
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
