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

  const needsAnyMrrMetric = settings.showMrr || settings.showSubscribers || settings.showChurn || settings.showArpu;
  const needsAnyRevenueMetric = settings.showRevenue || settings.showTicketMedio || settings.showRepurchaseRate || settings.showRevenueSplit;

  const [rawMetrics, revenueMetrics, mrrHistory, revenueHistory, sankeyData] = await Promise.all([
    needsAnyMrrMetric ? getPublicMetrics(org.id) : null,
    needsAnyRevenueMetric ? getPublicRevenueMetrics(org.id) : null,
    needsAnyMrrMetric && settings.showGrowthChart ? getPublicMrrHistory(org.id, 12) : null,
    needsAnyRevenueMetric && settings.showGrowthChart ? getPublicRevenueHistory(org.id, 12) : null,
    settings.showSankey ? getPublicSankeyData(org.id) : null,
  ]);

  const resolvedRevenueMetrics = revenueMetrics ?? {
    monthlyRevenue: 0,
    revenueGrowthRate: 0,
    uniqueCustomers: 0,
    ticketMedio: 0,
    repurchaseRate: 0,
    recurringRevenue: 0,
    oneTimeRevenue: 0,
  };

  const businessMode = detectBusinessMode(
    org.hasRecurringRevenue,
    resolvedRevenueMetrics.oneTimeRevenue,
    resolvedRevenueMetrics.recurringRevenue,
  );

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
      mrr: rawMetrics && settings.showMrr
        ? maskValue(rawMetrics.mrr, settings.showAbsoluteValues, org.currency, org.locale)
        : null,
      activeSubscriptions: rawMetrics && settings.showSubscribers
        ? {
            value: settings.showAbsoluteValues
              ? rawMetrics.activeSubscriptions
              : rawMetrics.activeSubscriptions > 0
                ? `${Math.floor(rawMetrics.activeSubscriptions / 10) * 10}+`
                : "0",
          }
        : null,
      churnRate: rawMetrics && settings.showChurn ? rawMetrics.churnRate : null,
      arpu: rawMetrics && settings.showArpu
        ? maskValue(rawMetrics.arpu, settings.showAbsoluteValues, org.currency, org.locale)
        : null,
      mrrGrowthRate: rawMetrics ? rawMetrics.mrrGrowthRate : null,

      monthlyRevenue: revenueMetrics && settings.showRevenue
        ? maskValue(revenueMetrics.monthlyRevenue, settings.showAbsoluteValues, org.currency, org.locale)
        : null,
      revenueGrowthRate: revenueMetrics ? revenueMetrics.revenueGrowthRate : null,
      uniqueCustomers: revenueMetrics && settings.showRevenue
        ? { value: revenueMetrics.uniqueCustomers }
        : null,
      ticketMedio: revenueMetrics && settings.showTicketMedio
        ? maskValue(revenueMetrics.ticketMedio, settings.showAbsoluteValues, org.currency, org.locale)
        : null,
      repurchaseRate: revenueMetrics && settings.showRepurchaseRate
        ? revenueMetrics.repurchaseRate
        : null,
      revenueSplit: revenueMetrics && settings.showRevenueSplit && revenueMetrics.recurringRevenue + revenueMetrics.oneTimeRevenue > 0
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
