"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useFunnel } from "@/hooks/queries/use-funnel";
import { useDaily } from "@/hooks/queries/use-daily";
import { useSourceDistribution } from "@/hooks/queries/use-source-distribution";
import { useTopProducts } from "@/hooks/queries/use-top-products";
import { useOrganization } from "@/components/providers/organization-provider";
import { useAtRiskCustomersCount } from "@/hooks/queries/use-at-risk-customers";
import { useCreateDashboardAlerts } from "@/hooks/mutations/use-create-dashboard-alerts";
import { useOrgDataSources } from "@/hooks/queries/use-org-data-sources";
import { useMrrOverview } from "@/hooks/queries/use-mrr-overview";
import { useMrrMovement } from "@/hooks/queries/use-mrr-movement";
import { useMrrGrowth } from "@/hooks/queries/use-mrr-growth";
import { getDemoData } from "@/lib/demo-data";
import { fmtCurrencyDecimal } from "@/utils/format";
import { IDateFilter } from "@/interfaces/dashboard.interface";
import { KpiCards } from "./kpi-cards";
import { FunnelSection } from "./funnel-section";
import { DailyChart } from "./daily-chart";
import { PeriodFilter } from "./period-filter";
import { SourceChart } from "./source-chart";
import { TopProducts } from "./top-products";
import { TopCustomersCard } from "./top-customers-card";
import { StepVisibilityToggle } from "@/components/ui/step-visibility-toggle";
import { MrrKpiCards } from "@/app/[locale]/[slug]/mrr/_components/mrr-kpi-cards";
import { SubscriberFlowSankey } from "@/app/[locale]/[slug]/mrr/_components/subscriber-flow-sankey";
import { MrrGrowthChart } from "@/app/[locale]/[slug]/mrr/_components/mrr-growth-chart";
import { MrrMovementChart } from "@/app/[locale]/[slug]/mrr/_components/mrr-movement-chart";
import { ActiveSubscriptionsTable } from "@/app/[locale]/[slug]/mrr/_components/active-subscriptions-table";
import type { StepVisibilityToggleProps } from "@/components/ui/step-visibility-toggle";
import type { IGenericFunnelData } from "@/interfaces/dashboard.interface";
import { IconCreditCard, IconCode, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { GatewayPromptModal } from "./gateway-prompt-modal";

interface OverviewContentProps {
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

function GatewayOnlyDashboard({
  filter,
  orgId,
  slug,
  isDemo,
  currency,
}: {
  filter: IDateFilter;
  orgId: string;
  slug: string;
  isDemo?: boolean;
  currency?: string;
}) {
  const t = useTranslations("dashboard.overview");
  const demoData = isDemo ? getDemoData(currency ?? "BRL") : null;

  const { data: overview, isPending: overviewLoading } = useMrrOverview(orgId, filter);
  const { data: movement, isPending: movementLoading } = useMrrMovement(orgId, filter);
  const { data: growth, isPending: growthLoading } = useMrrGrowth(orgId, filter);

  const effectiveOverview = demoData?.mrrOverview ?? overview;
  const effectiveMovement = demoData?.mrrMovement ?? movement;
  const effectiveGrowth = demoData?.mrrGrowth ?? growth;
  const effectiveLoading = isDemo ? false : undefined;

  return (
    <>
      {!isDemo && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-950/10 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-300">
              {t("trackerPromptTitle")}
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
              {t("trackerPromptDescription")}
            </p>
          </div>
          <Link
            href={`/onboarding/${slug}?step=install`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-[11px] font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-600/30 hover:bg-indigo-600/30 transition-colors shrink-0"
          >
            <IconCode size={12} />
            {t("trackerPromptCta")}
          </Link>
        </div>
      )}

      <MrrKpiCards data={effectiveOverview} isLoading={effectiveLoading ?? overviewLoading} />

      <SubscriberFlowSankey data={effectiveOverview} isLoading={effectiveLoading ?? overviewLoading} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <MrrGrowthChart data={effectiveGrowth} isLoading={effectiveLoading ?? growthLoading} />
        <MrrMovementChart data={effectiveMovement} isLoading={effectiveLoading ?? movementLoading} />
      </div>

      {!isDemo && <ActiveSubscriptionsTable organizationId={orgId} />}
    </>
  );
}

function TrackerDashboard({
  filter,
  orgId,
  slug,
  locale,
  currency,
  organization,
}: {
  filter: IDateFilter;
  orgId: string;
  slug: string;
  locale: string;
  currency: string;
  organization: { funnelSteps?: { eventType: string; hidden?: boolean }[] } | null;
}) {
  const tTour = useTranslations("tour.welcome.dashboard");
  const tAlerts = useTranslations("dashboard.alerts");

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
  const { data: atRiskData } = useAtRiskCustomersCount(orgId);
  const { mutate: createAlerts } = useCreateDashboardAlerts(orgId);

  const allSteps: StepOption[] = (funnel?.steps ?? [])
    .filter((s) => s.key !== "pageview")
    .map((s) => ({ eventType: s.key, label: s.label }));

  const stepMeta = funnel?.steps.map((s) => ({ key: s.key, label: s.label })) ?? [];

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return localStorage.getItem("groware_dashboard_banner_dismissed") === "1";
    } catch {
      return false;
    }
  });

  const hasNoData =
    !funnelLoading &&
    funnel !== undefined &&
    (funnel?.steps ?? []).every((s) => s.value === 0) &&
    (!funnel?.revenue || funnel.revenue === 0);

  const alertsDispatchedRef = useRef(false);

  useEffect(() => {
    if (!funnel || funnelLoading || !orgId || alertsDispatchedRef.current) return;

    const alertEntries = buildAlertEntries(funnel, slug, tAlerts, locale, currency, atRiskData ?? undefined);
    if (alertEntries.length === 0) return;

    alertsDispatchedRef.current = true;
    createAlerts({ organizationId: orgId, alerts: alertEntries });
  }, [funnel, funnelLoading, orgId, slug, atRiskData, tAlerts, createAlerts, locale, currency]);

  return (
    <>
      <div className="flex items-center gap-2">
        {allSteps.length > 0 && (
          <StepVisibilityToggle
            steps={allSteps}
            hiddenKeys={hiddenKeys}
            onToggle={toggleHidden}
          />
        )}
      </div>

      {hasNoData && !bannerDismissed && (
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

      <KpiCards data={funnel} isLoading={funnelLoading} hiddenKeys={hiddenKeys} />

      <div className="grid grid-cols-1 xl:grid-cols-[55fr_45fr] gap-4">
        <FunnelSection
          data={funnel}
          isLoading={funnelLoading}
          hiddenKeys={hiddenKeys}
        />
        <SourceChart data={sourceData} isLoading={sourceLoading} />
      </div>

      <DailyChart
        data={dailyResult?.rows}
        stepMeta={stepMeta}
        isLoading={dailyLoading}
        hiddenKeys={hiddenKeys}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TopProducts data={topProducts} isLoading={topProductsLoading} />
        <TopCustomersCard />
      </div>
    </>
  );
}

export function OverviewContent({ filter }: OverviewContentProps) {
  const t = useTranslations("dashboard.overview");
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const slug = organization?.slug ?? "";
  const locale = organization?.locale ?? "pt-BR";
  const currency = organization?.currency ?? "BRL";

  const { data: dataSources, isPending: dataSourcesLoading } =
    useOrgDataSources(orgId);

  const hasGateway = dataSources?.hasGateway ?? false;
  const hasTracker = dataSources?.hasTracker ?? false;
  const isDemo = !hasGateway && !hasTracker;
  const showGatewayDashboard = isDemo || (hasGateway && !hasTracker);

  return (
    <div className="space-y-4">
      {!showGatewayDashboard && !isDemo && <GatewayPromptModal />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">{t("title")}</h1>
          <p className="text-xs text-zinc-500">
            {showGatewayDashboard ? t("gatewayOnlySubtitle") : t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <PeriodFilter filter={filter} />
          </Suspense>
        </div>
      </div>

      {!dataSourcesLoading && orgId && showGatewayDashboard && (
        <GatewayOnlyDashboard
          filter={filter}
          orgId={orgId}
          slug={slug}
          isDemo={isDemo}
          currency={currency}
        />
      )}

      {!dataSourcesLoading && orgId && !showGatewayDashboard && (
        <TrackerDashboard
          filter={filter}
          orgId={orgId}
          slug={slug}
          locale={locale}
          currency={currency}
          organization={organization}
        />
      )}
    </div>
  );
}
