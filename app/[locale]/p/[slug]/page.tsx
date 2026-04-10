export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { PublicHeader } from "./_components/public-header";
import { PublicHeroMrr } from "./_components/public-hero-mrr";
import { PublicHeroRevenue } from "./_components/public-hero-revenue";
import { PublicMetricsGrid } from "./_components/public-metrics-grid";
import { PublicMrrChart } from "./_components/public-mrr-chart";
import { PublicRevenueChart } from "./_components/public-revenue-chart";
import { PublicRevenueSplitBar } from "./_components/public-revenue-split-bar";
import { PublicSankey } from "./_components/public-sankey";
import { PublicShareBar } from "./_components/public-share-bar";
import { PublicFooter } from "./_components/public-footer";
import type { IPublicPageData } from "@/interfaces/public-page.interface";

interface PublicPageProps {
  params: Promise<{ slug: string }>;
}

async function fetchPublicData(slug: string): Promise<IPublicPageData | null> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/public/${slug}`, {
    next: { tags: [`public-page-${slug}`] },
  });

  if (!res.ok) return null;

  return res.json();
}

function getFormattedMonth(): string {
  const m = dayjs().locale("pt-br").format("MMMM [de] YYYY");
  return m.charAt(0).toUpperCase() + m.slice(1);
}

export async function generateMetadata({ params }: PublicPageProps) {
  const { slug } = await params;
  const data = await fetchPublicData(slug);
  if (!data) return { title: "Página não encontrada" };

  const fmt = (v: number) =>
    new Intl.NumberFormat(data.org.locale, {
      style: "currency",
      currency: data.org.currency,
      maximumFractionDigits: 0,
    }).format(v / 100);

  let primaryStr: string | null = null;
  let primaryLabel = "";

  if (data.metrics.mrr && typeof data.metrics.mrr.value === "number") {
    primaryStr = fmt(data.metrics.mrr.value);
    primaryLabel = "MRR";
  } else if (data.metrics.monthlyRevenue && typeof data.metrics.monthlyRevenue.value === "number") {
    primaryStr = fmt(data.metrics.monthlyRevenue.value);
    primaryLabel = "Receita";
  }

  const descParts = [
    primaryStr ? `${primaryStr} ${primaryLabel}` : null,
    data.metrics.activeSubscriptions
      ? `${data.metrics.activeSubscriptions.value} assinantes`
      : null,
    data.metrics.uniqueCustomers
      ? `${data.metrics.uniqueCustomers.value} clientes`
      : null,
  ].filter(Boolean);

  const description = data.org.description ?? descParts.join(" · ");

  return {
    title: `${data.org.name} | Métricas públicas`,
    description,
    openGraph: {
      title: `${data.org.name}${primaryStr ? ` — ${primaryStr} ${primaryLabel}` : ""}`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.org.name}${primaryStr ? ` — ${primaryStr} ${primaryLabel}` : ""}`,
      description,
    },
  };
}

export default async function PublicPage({ params }: PublicPageProps) {
  const { slug } = await params;
  const data = await fetchPublicData(slug);

  if (!data) notFound();

  const month = getFormattedMonth();

  const hasMrr = data.metrics.mrr !== null && data.metrics.mrr !== undefined;
  const hasRevenue = data.metrics.monthlyRevenue !== null && data.metrics.monthlyRevenue !== undefined;

  const hasRecurringSecondary =
    data.metrics.activeSubscriptions !== null ||
    data.metrics.churnRate !== null ||
    data.metrics.arpu !== null;

  const hasRevenueSecondary =
    data.metrics.uniqueCustomers !== null ||
    data.metrics.ticketMedio !== null ||
    data.metrics.repurchaseRate !== null;

  const hasSecondaryMetrics = hasRecurringSecondary || hasRevenueSecondary;

  return (
    <main className="min-h-screen bg-[#09090b] text-white relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-600/[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="space-y-4">
          <PublicHeader org={data.org} month={month} />

          {hasMrr && (
            <PublicHeroMrr
              metrics={data.metrics}
              org={data.org}
              mrrHistory={data.charts.mrrHistory}
            />
          )}

          {!hasMrr && hasRevenue && (
            <PublicHeroRevenue
              metrics={data.metrics}
              org={data.org}
              revenueHistory={data.charts.revenueHistory}
              businessMode={data.businessMode}
            />
          )}

          {hasMrr && hasRevenue && (
            <PublicHeroRevenue
              metrics={data.metrics}
              org={data.org}
              revenueHistory={data.charts.revenueHistory}
              businessMode={data.businessMode}
            />
          )}

          {data.metrics.revenueSplit && (
            <PublicRevenueSplitBar
              recurring={data.metrics.revenueSplit.recurring}
              oneTime={data.metrics.revenueSplit.oneTime}
              currency={data.org.currency}
              locale={data.org.locale}
            />
          )}

          {hasSecondaryMetrics && (
            <PublicMetricsGrid
              metrics={data.metrics}
              org={data.org}
              businessMode={data.businessMode}
            />
          )}

          {data.charts.mrrHistory && data.charts.mrrHistory.length > 0 && (
            <PublicMrrChart
              data={data.charts.mrrHistory}
              currency={data.org.currency}
              locale={data.org.locale}
            />
          )}

          {data.charts.revenueHistory && data.charts.revenueHistory.length > 0 && (
            <PublicRevenueChart
              data={data.charts.revenueHistory}
              currency={data.org.currency}
              locale={data.org.locale}
            />
          )}

          {data.charts.sankey && (
            <PublicSankey
              data={data.charts.sankey}
              currency={data.org.currency}
              locale={data.org.locale}
            />
          )}

          <PublicShareBar org={data.org} metrics={data.metrics} month={month} />

          <PublicFooter
            verified={data.org.verified}
            updatedAt={data.updatedAt}
          />
        </div>
      </div>
    </main>
  );
}
