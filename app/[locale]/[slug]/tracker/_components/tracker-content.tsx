"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconCreditCard, IconCode, IconX } from "@tabler/icons-react";
import { useFunnel } from "@/hooks/queries/use-funnel";
import { useDaily } from "@/hooks/queries/use-daily";
import { useSourceDistribution } from "@/hooks/queries/use-source-distribution";
import { useTopProducts } from "@/hooks/queries/use-top-products";
import { useOrganization } from "@/components/providers/organization-provider";
import { useOrgDataSources } from "@/hooks/queries/use-org-data-sources";
import { getDemoData } from "@/lib/demo-data";
import { useAtRiskCustomersCount } from "@/hooks/queries/use-at-risk-customers";
import { DemoModeBanner } from "@/app/[locale]/[slug]/_components/demo-mode-banner";
import { useCreateDashboardAlerts } from "@/hooks/mutations/use-create-dashboard-alerts";
import { fmtCurrencyDecimal } from "@/utils/format";
import { KpiCards } from "@/app/[locale]/[slug]/_components/kpi-cards";
import { FunnelSection } from "@/app/[locale]/[slug]/_components/funnel-section";
import { DailyChart } from "@/app/[locale]/[slug]/_components/daily-chart";
import { PeriodFilter } from "@/app/[locale]/[slug]/_components/period-filter";
import { SourceChart } from "@/app/[locale]/[slug]/_components/source-chart";
import { TopProducts } from "@/app/[locale]/[slug]/_components/top-products";
import { TopCustomersCard } from "@/app/[locale]/[slug]/_components/top-customers-card";
import { StepVisibilityToggle } from "@/components/ui/step-visibility-toggle";
import type { StepVisibilityToggleProps } from "@/components/ui/step-visibility-toggle";
import type {
  IDateFilter,
  IGenericFunnelData,
  ISourceDistribution,
  ITopProduct,
} from "@/interfaces/dashboard.interface";

interface TrackerContentProps {
  filter: IDateFilter;
}

type StepOption = StepVisibilityToggleProps["steps"][number];

interface AlertEntry {
  id: string;
  title: string;
  body: string;
  linkUrl?: string;
  metadata?: {
    alertId: string;
    abandonedCount?: number;
  };
}

interface AtRiskData {
  count: number;
  totalValueInCents: number;
  topCustomers: { name: string | null; email: string | null }[];
}

function buildAlertEntries(
  data: IGenericFunnelData,
  slug: string,
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  locale: string,
  currency: string,
  atRisk?: AtRiskData,
): AlertEntry[] {
  const alerts: AlertEntry[] = [];

  const prevMap = new Map(
    (data.previousSteps ?? []).map((s) => [s.key, s.value]),
  );

  const abandonedCount = data.checkoutAbandoned ?? 0;
  if (abandonedCount > 0) {
    const avgTicketCents =
      data.revenue > 0
        ? data.revenue /
          Math.max(
            data.steps.find((s) => s.key === "purchase" || s.key === "purchases")
              ?.value ?? 1,
            1,
          )
        : 0;
    const lostRevenue = abandonedCount * avgTicketCents;
    alerts.push({
      id: "abandoned",
      title: t("abandonedCarts", { count: abandonedCount }),
      body: t("abandonedRevenue", { amount: fmtCurrencyDecimal(lostRevenue / 100, locale, currency) }),
      linkUrl: `/${slug}/events?event_types=checkout_abandoned`,
      metadata: { alertId: "abandoned", abandonedCount },
    });
  }

  const revenueChange =
    data.previousRevenue && data.previousRevenue > 0
      ? ((data.revenue - data.previousRevenue) / data.previousRevenue) * 100
      : null;

  if (revenueChange !== null && Math.abs(revenueChange) >= 5) {
    const isUp = revenueChange > 0;
    alerts.push({
      id: "revenue-trend",
      title: isUp
        ? t("revenueGrew", { pct: revenueChange.toFixed(0) })
        : t("revenueFell", { pct: Math.abs(revenueChange).toFixed(0) }),
      body: isUp
        ? t("revenueChangeUp", {
            from: fmtCurrencyDecimal((data.previousRevenue ?? 0) / 100, locale, currency),
            to: fmtCurrencyDecimal(data.revenue / 100, locale, currency),
          })
        : t("revenueChangeDown", {
            from: fmtCurrencyDecimal((data.previousRevenue ?? 0) / 100, locale, currency),
            to: fmtCurrencyDecimal(data.revenue / 100, locale, currency),
          }),
      metadata: { alertId: "revenue-trend" },
    });
  }

  const nonPageviewSteps = data.steps.filter((s) => s.key !== "pageview");
  let worstRate = Infinity;
  let worstLabel = "";
  let worstFromLabel = "";
  for (let i = 0; i < nonPageviewSteps.length - 1; i++) {
    const from = nonPageviewSteps[i];
    const to = nonPageviewSteps[i + 1];
    if (from.value <= 0) continue;
    const rate = (to.value / from.value) * 100;
    if (rate < worstRate) {
      worstRate = rate;
      worstFromLabel = from.label;
      worstLabel = to.label;
    }
  }
  if (worstRate < 30 && worstLabel) {
    alerts.push({
      id: "bottleneck",
      title: t("bottleneck", { from: worstFromLabel, to: worstLabel }),
      body: t("bottleneckDescription", { pct: worstRate.toFixed(0) }),
      metadata: { alertId: "bottleneck" },
    });
  }

  const stepsWithGrowth = nonPageviewSteps.filter((s) => {
    const prev = prevMap.get(s.key);
    if (!prev || prev === 0) return false;
    return ((s.value - prev) / prev) * 100 >= 20;
  });
  if (stepsWithGrowth.length > 0) {
    const best = stepsWithGrowth[0];
    const prev = prevMap.get(best.key) ?? 1;
    const pct = ((best.value - prev) / prev) * 100;
    alerts.push({
      id: "growth-step",
      title: t("stepGrew", { label: best.label, pct: pct.toFixed(0) }),
      body: t("stepGrewDescription", { from: prev, to: best.value }),
      metadata: { alertId: "growth-step" },
    });
  }

  if (atRisk && atRisk.count > 0) {
    const names = atRisk.topCustomers
      .map((c) => c.name ?? c.email ?? "—")
      .join(", ");
    const plural = atRisk.count > 1 ? "s" : "";
    alerts.unshift({
      id: "at-risk-customers",
      title: t("atRiskCustomers", { count: atRisk.count, plural }),
      body: t("atRiskCustomersDescription", { names }),
      linkUrl: `/${slug}/customers?tab=atRisk`,
      metadata: { alertId: "at-risk-customers" },
    });
  }

  return alerts;
}

export function TrackerContent({ filter }: TrackerContentProps) {
  const t = useTranslations("dashboard.tracker");
  const tTour = useTranslations("tour.welcome.dashboard");
  const tAlerts = useTranslations("dashboard.alerts");
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const slug = organization?.slug ?? "";
  const locale = organization?.locale ?? "pt-BR";
  const currency = organization?.currency ?? "BRL";

  const { data: dataSources, isPending: dataSourcesPending } = useOrgDataSources(orgId);
  const isDemo = !dataSourcesPending && !(dataSources?.hasRealData);
  const demoData = isDemo ? getDemoData(currency) : null;

  const initialHiddenKeys = new Set(
    (organization?.funnelSteps ?? [])
      .filter((s) => s.hidden)
      .map((s) => s.eventType),
  );

  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(initialHiddenKeys);

  const toggleHidden = useCallback((eventType: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) next.delete(eventType);
      else next.add(eventType);
      return next;
    });
  }, []);

  const { data: funnel, isPending: funnelLoading } = useFunnel(orgId, filter);
  const { data: dailyResult, isPending: dailyLoading } = useDaily(orgId, filter);
  const { data: sourceData, isPending: sourceLoading } = useSourceDistribution(orgId, filter);
  const { data: topProducts, isPending: topProductsLoading } = useTopProducts(orgId, filter);
  const { data: atRiskData } = useAtRiskCustomersCount(orgId ?? "");
  const { mutate: createAlerts } = useCreateDashboardAlerts(orgId ?? "");

  const effectiveFunnel = dataSourcesPending ? undefined : (isDemo ? (demoData?.funnel as IGenericFunnelData | undefined) : funnel);
  const effectiveFunnelLoading = dataSourcesPending || (isDemo ? false : funnelLoading);
  const effectiveDaily = dataSourcesPending ? undefined : (isDemo ? demoData?.daily : dailyResult?.rows);
  const effectiveDailyLoading = dataSourcesPending || (isDemo ? false : dailyLoading);
  const effectiveSource = dataSourcesPending ? undefined : (isDemo ? demoData?.sourceDistribution : sourceData);
  const effectiveSourceLoading = dataSourcesPending || (isDemo ? false : sourceLoading);
  const effectiveTopProducts = dataSourcesPending ? undefined : (isDemo ? demoData?.topProducts : topProducts);
  const effectiveTopProductsLoading = dataSourcesPending || (isDemo ? false : topProductsLoading);

  const allSteps: StepOption[] = (effectiveFunnel?.steps ?? [])
    .filter((s) => s.key !== "pageview")
    .map((s) => ({ eventType: s.key, label: s.label }));

  const stepMeta = effectiveFunnel?.steps.map((s) => ({ key: s.key, label: s.label })) ?? [];

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return localStorage.getItem("groware_dashboard_banner_dismissed") === "1";
    } catch {
      return false;
    }
  });

  const hasNoData =
    !effectiveFunnelLoading &&
    effectiveFunnel !== undefined &&
    (effectiveFunnel?.steps ?? []).every((s) => s.value === 0) &&
    (!effectiveFunnel?.revenue || effectiveFunnel.revenue === 0);

  const alertsDispatchedRef = useRef(false);

  useEffect(() => {
    if (!funnel || funnelLoading || !orgId || alertsDispatchedRef.current || isDemo) return;

    const alertEntries = buildAlertEntries(funnel, slug, tAlerts, locale, currency, atRiskData ?? undefined);
    if (alertEntries.length === 0) return;

    alertsDispatchedRef.current = true;
    createAlerts({ organizationId: orgId, alerts: alertEntries });
  }, [funnel, funnelLoading, orgId, slug, atRiskData, tAlerts, createAlerts, locale, currency, isDemo]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">{t("title")}</h1>
          <p className="text-xs text-zinc-500">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {allSteps.length > 0 && (
            <StepVisibilityToggle
              steps={allSteps}
              hiddenKeys={hiddenKeys}
              onToggle={toggleHidden}
            />
          )}
          <Suspense>
            <PeriodFilter filter={filter} />
          </Suspense>
        </div>
      </div>

      {isDemo && <DemoModeBanner module="tracker" slug={slug} />}

      {hasNoData && !bannerDismissed && !isDemo && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 relative">
          <p className="flex-1 text-xs text-zinc-500 leading-relaxed pr-6 sm:pr-0">
            {tTour("noDataSubtitle")}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/${slug}/settings/integrations`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-[11px] font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-600/30 hover:bg-indigo-600/30 transition-colors"
            >
              <IconCreditCard size={12} />
              {tTour("ctaGateway")}
            </Link>
            <Link
              href={`/onboarding/${slug}?step=install`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/60 px-3 py-1.5 text-[11px] font-semibold text-zinc-400 ring-1 ring-inset ring-zinc-700/40 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              <IconCode size={12} />
              {tTour("ctaTracker")}
            </Link>
          </div>
          <button
            onClick={() => {
              setBannerDismissed(true);
              try {
                localStorage.setItem("groware_dashboard_banner_dismissed", "1");
              } catch {}
            }}
            className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <IconX size={12} />
          </button>
        </div>
      )}

      <KpiCards data={effectiveFunnel} isLoading={effectiveFunnelLoading} hiddenKeys={hiddenKeys} />

      <div className="grid grid-cols-1 xl:grid-cols-[55fr_45fr] gap-4">
        <FunnelSection
          data={effectiveFunnel}
          isLoading={effectiveFunnelLoading}
          hiddenKeys={hiddenKeys}
        />
        <SourceChart data={effectiveSource as ISourceDistribution | null | undefined} isLoading={effectiveSourceLoading} />
      </div>

      <DailyChart
        data={effectiveDaily}
        stepMeta={stepMeta}
        isLoading={effectiveDailyLoading}
        hiddenKeys={hiddenKeys}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TopProducts data={effectiveTopProducts as ITopProduct[] | undefined} isLoading={effectiveTopProductsLoading} />
        <TopCustomersCard />
      </div>
    </div>
  );
}
