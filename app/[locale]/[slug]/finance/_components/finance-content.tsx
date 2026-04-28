"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { useFinancial } from "@/hooks/queries/use-financial";
import { useDaily } from "@/hooks/queries/use-daily";
import { useOrganization } from "@/components/providers/organization-provider";
import { useIntegrations } from "@/hooks/queries/use-integrations";
import { useOrgDataSources } from "@/hooks/queries/use-org-data-sources";
import { getDemoData } from "@/lib/demo-data";
import { IDateFilter } from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/[locale]/[slug]/_components/period-filter";
import { DemoModeBanner } from "@/app/[locale]/[slug]/_components/demo-mode-banner";
import { FinanceKpiCards } from "./finance-kpi-cards";
import { RevenueLineChart } from "./revenue-line-chart";
import { FinanceBreakdownTable } from "./finance-breakdown-table";
import { ProfitLossWaterfall } from "@/app/[locale]/[slug]/costs/_components/profit-loss-waterfall";
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconChevronDown,
  IconChevronUp,
  IconCurrencyDollar,
  IconCalendarOff,
} from "@tabler/icons-react";
import { WelcomeState } from "@/components/ui/welcome-state";
import { InlineBanner } from "@/components/ui/welcome-state";

interface FinanceContentProps {
  filter: IDateFilter;
  slug: string;
}

const PL_STEP_KEYS = [
  { key: "grossRevenue" },
  { key: "discounts", positive: false },
  { key: "variableCosts", positive: false },
  { key: "operatingProfit", highlight: true },
  { key: "fixedCosts", positive: false },
  { key: "netProfit", highlight: true },
  { key: "netMargin" },
] as const;

export function FinanceContent({ filter, slug }: FinanceContentProps) {
  const t = useTranslations("finance.financeContent");
  const tTour = useTranslations("tour.welcome.finance");
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const currency = organization?.currency ?? "BRL";
  const [showExplanation, setShowExplanation] = useState(false);

  const { data: dataSources, isPending: dataSourcesPending, isFetching: dataSourcesFetching } = useOrgDataSources(orgId);
  const dataSourcesNotReady = dataSourcesPending || dataSourcesFetching;
  const isDemo = !dataSourcesNotReady && !(dataSources?.hasRealData);
  const demoData = isDemo ? getDemoData(currency) : null;

  const { data: integrations, isPending: integrationsLoading } = useIntegrations(orgId ?? "");
  const hasActiveIntegration = !integrationsLoading && (integrations ?? []).some((i) => i.status === "active");

  const { data: financial, isPending: financialLoading } = useFinancial(
    orgId,
    filter,
  );
  const { data: dailyResult, isPending: dailyLoading } = useDaily(
    orgId,
    filter,
  );

  const effectiveFinancial = (dataSourcesNotReady ? undefined : (demoData?.financial ?? financial)) as typeof financial;
  const effectiveDaily = dataSourcesNotReady ? undefined : (demoData?.daily ?? dailyResult?.rows);
  const effectiveFinancialLoading = dataSourcesNotReady || (isDemo ? false : financialLoading);
  const effectiveDailyLoading = dataSourcesNotReady || (isDemo ? false : dailyLoading);

  const pl = effectiveFinancial?.pl ?? null;
  const periodDays = effectiveFinancial?.periodDays ?? 30;
  const isSubMonth = periodDays < 30;

  const hasNoPayments =
    !effectiveFinancialLoading &&
    effectiveFinancial !== undefined &&
    (effectiveFinancial?.grossRevenueInCents ?? 0) === 0;

  const hasCostsConfigured =
    pl !== null &&
    ((pl.totalFixedCostsInCents ?? 0) > 0 || (pl.totalVariableCostsInCents ?? 0) > 0);

  const plSteps = PL_STEP_KEYS.map((step) => ({
    label: t(`plSteps.${step.key}.label`),
    desc: t(`plSteps.${step.key}.desc`),
    positive: "positive" in step ? step.positive : undefined,
    highlight: "highlight" in step ? step.highlight : undefined,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">{t("title")}</h1>
          <p className="text-xs text-zinc-500">
            {t("subtitle")}
          </p>
        </div>
        <Suspense>
          <PeriodFilter filter={filter} />
        </Suspense>
      </div>

      {isDemo && <DemoModeBanner module="finance" slug={slug} />}

      {hasNoPayments && !hasActiveIntegration && !isDemo ? (
        <WelcomeState
          icon={IconCurrencyDollar}
          title={tTour("noPaymentsTitle")}
          description={tTour("noPaymentsDescription")}
          ctaLabel={tTour("cta")}
          ctaHref={`/${slug}/settings/integrations`}
          className="min-h-[320px]"
        />
      ) : hasNoPayments && hasActiveIntegration && !isDemo ? (
        <WelcomeState
          icon={IconCalendarOff}
          title={tTour("noDataPeriodTitle")}
          description={tTour("noDataPeriodDescription")}
          className="min-h-[320px]"
        />
      ) : (
        <>
          {pl && isSubMonth && pl.totalFixedCostsInCents > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <IconAlertTriangle
                size={15}
                className="text-amber-400 mt-0.5 shrink-0"
              />
              <p className="text-xs text-amber-300">
                {t("fixedCostsWarning", { days: periodDays })}
              </p>
            </div>
          )}

          {!hasCostsConfigured && !effectiveFinancialLoading && (
            <InlineBanner
              description={tTour("noCostsBanner")}
              ctaLabel={tTour("noCostsCta")}
              ctaHref={`/${slug}/costs`}
            />
          )}

          <FinanceKpiCards data={effectiveFinancial} isLoading={effectiveFinancialLoading} slug={slug} />

          <ProfitLossWaterfall pl={pl} isLoading={effectiveFinancialLoading} />

          <RevenueLineChart data={effectiveDaily} pl={pl} isLoading={effectiveDailyLoading} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <FinanceBreakdownTable
              title={t("revenueByPaymentMethod")}
              subtitle={t("revenueByPaymentMethodSubtitle")}
              rows={
                effectiveFinancial?.byPaymentMethod?.map((r) => ({
                  name: r.method,
                  payments: r.purchases,
                  revenue: r.revenue,
                  percentage: r.percentage,
                })) ?? []
              }
              isLoading={effectiveFinancialLoading}
            />
            <FinanceBreakdownTable
              title={t("revenueByCategory")}
              subtitle={t("revenueByCategorySubtitle")}
              rows={
                (effectiveFinancial as typeof financial)?.byCategory?.map((r) => ({
                  name: r.category,
                  payments: r.purchases,
                  revenue: r.revenue,
                  percentage: r.percentage,
                  marginPercentage: r.marginPercentage,
                })) ?? []
              }
              isLoading={effectiveFinancialLoading}
              showMargin
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <button
              onClick={() => setShowExplanation((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <IconInfoCircle size={15} className="text-zinc-500" />
                <span className="text-sm font-medium text-zinc-300">
                  {t("howPlWorks")}
                </span>
              </div>
              {showExplanation ? (
                <IconChevronUp size={14} className="text-zinc-500" />
              ) : (
                <IconChevronDown size={14} className="text-zinc-500" />
              )}
            </button>

            {showExplanation && (
              <div className="px-5 pb-5 space-y-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 pt-4">
                  {t("plDescription")}
                </p>
                <div className="space-y-2">
                  {plSteps.map((step) => (
                    <div
                      key={step.label}
                      className={`flex gap-3 rounded-lg px-3 py-2.5 ${step.highlight ? "bg-zinc-800/50 border border-zinc-700/50" : ""}`}
                    >
                      <div className="min-w-[160px]">
                        <span
                          className={`text-xs font-semibold font-mono ${step.positive === false ? "text-red-400" : step.highlight ? "text-indigo-300" : "text-zinc-300"}`}
                        >
                          {step.label}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500">{step.desc}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-3 py-2.5 space-y-1">
                  <p className="text-xs font-semibold text-zinc-400">
                    {t("aboutSegmentedVariableCosts")}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {t("segmentedVariableCostsDescription")}{" "}
                    <strong className="text-zinc-400">{t("costsLink")}</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
