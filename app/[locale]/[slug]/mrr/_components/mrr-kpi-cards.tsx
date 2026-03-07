"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fmtBRLDecimal } from "@/utils/format";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconUsers,
  IconReceipt,
  IconAlertCircle,
  IconCurrencyDollar,
  IconHeartHandshake,
  IconMinus,
  IconArrowUpRight,
  IconZoomMoney,
  IconRefresh,
  IconCalendarStats,
  IconChartBar,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { IMrrOverview } from "@/interfaces/mrr.interface";

function computeVariation(current: number, previous: number) {
  const pct = ((current - previous) / previous) * 100;
  return { abs: Math.abs(pct), isUp: pct > 0 };
}

interface VariationBadgeProps {
  current: number;
  previous: number | undefined;
  invertColors?: boolean;
}

function VariationBadge({ current, previous, invertColors = false }: VariationBadgeProps) {
  if (!previous || previous === 0) return null;
  const { abs, isUp } = computeVariation(current, previous);
  if (abs < 0.5) {
    return (
      <span className="flex items-center gap-0.5 rounded-md bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-500">
        <IconMinus size={9} />
        0%
      </span>
    );
  }
  const positive = invertColors ? !isUp : isUp;
  return (
    <span
      className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium ${
        positive ? "bg-emerald-950/60 text-emerald-400" : "bg-rose-950/60 text-rose-400"
      }`}
    >
      {isUp ? <IconTrendingUp size={9} /> : <IconTrendingDown size={9} />}
      {isUp ? "+" : "-"}{abs.toFixed(1)}%
    </span>
  );
}

function BlockHeader({ label, muted }: { label: string; muted?: string }) {
  return (
    <div className="flex items-baseline gap-2 px-0.5 pt-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        {label}
      </p>
      {muted && (
        <p className="text-[10px] text-zinc-700">{muted}</p>
      )}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  subLabel?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  current?: number;
  previous?: number;
  invertColors?: boolean;
  hero?: boolean;
  tooltip: string;
}

function KpiCard({
  label,
  value,
  subLabel,
  icon: Icon,
  color,
  bgColor,
  current,
  previous,
  invertColors,
  hero,
  tooltip,
}: KpiCardProps) {
  const t = useTranslations("mrr.kpiCards");
  const hasPrev = previous !== undefined && previous > 0 && current !== undefined;
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-1.5 ${
        hero ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 truncate">
            {label}
          </span>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 text-zinc-700 hover:text-zinc-400 transition-colors focus:outline-none"
                  aria-label={t("infoAbout", { label })}
                >
                  <IconInfoCircle size={11} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[220px] bg-zinc-800 border-zinc-700 text-zinc-200 text-xs leading-relaxed"
              >
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-md shrink-0 ${bgColor}`}
        >
          <Icon size={12} className={color} />
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
        <span
          className={`font-bold font-mono leading-none whitespace-nowrap ${color} ${
            hero ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
          }`}
        >
          {value}
        </span>
        {hasPrev && current !== undefined && previous !== undefined && (
          <VariationBadge current={current} previous={previous} invertColors={invertColors} />
        )}
      </div>

      {hasPrev && (
        <p className="text-[10px] text-zinc-600 leading-tight truncate">
          {t("comparedToPreviousPeriod")}
        </p>
      )}
      {!hasPrev && subLabel && (
        <p className="text-[10px] text-zinc-600 leading-tight">{subLabel}</p>
      )}
    </div>
  );
}

function SkeletonCard({ hero }: { hero?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-1.5 ${
        hero ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20 bg-zinc-800" />
        <Skeleton className="h-6 w-6 rounded-md bg-zinc-800" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <Skeleton className={`bg-zinc-800 ${hero ? "h-8 w-32" : "h-6 w-24"}`} />
        <Skeleton className="h-4 w-10 bg-zinc-800 rounded-md" />
      </div>
      <Skeleton className="h-3 w-32 bg-zinc-800/60 rounded" />
    </div>
  );
}

interface MrrKpiCardsProps {
  data: IMrrOverview | null | undefined;
  isLoading: boolean;
}

export function MrrKpiCards({ data, isLoading }: MrrKpiCardsProps) {
  const t = useTranslations("mrr.kpiCards");

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SkeletonCard hero />
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  const mrr = data?.mrr ?? 0;
  const arr = data?.arr ?? 0;
  const activeSubscriptions = data?.activeSubscriptions ?? 0;
  const arpu = data?.arpu ?? 0;
  const churnRate = data?.churnRate ?? 0;
  const revenueChurnRate = data?.revenueChurnRate ?? 0;
  const estimatedLtv = data?.estimatedLtv ?? 0;
  const mrrGrowthRate = data?.mrrGrowthRate ?? 0;
  const totalPeriodRevenue = data?.totalPeriodRevenue ?? 0;
  const totalPurchaseCount = data?.totalPurchaseCount ?? 0;
  const renewalSubscriptions = data?.renewalSubscriptions ?? 0;
  const nrr = data?.nrr ?? 0;
  const forecastNext30dRevenue = data?.forecastNext30dRevenue ?? 0;
  const forecastNext30dCount = data?.forecastNext30dCount ?? 0;

  const isGrowthPositive = mrrGrowthRate >= 0;
  const isNrrPositive = nrr >= 100;

  return (
    <div className="space-y-3">
      <BlockHeader label={t("snapshotHeader")} muted={t("snapshotMuted")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label={t("mrr.label")}
          value={fmtBRLDecimal(mrr / 100)}
          subLabel={t("mrr.subLabel")}
          icon={IconCurrencyDollar}
          color="text-cyan-400"
          bgColor="bg-cyan-600/20"
          current={mrr}
          previous={data?.previousMrr}
          tooltip={t("mrr.tooltip")}
        />
        <KpiCard
          label={t("arr.label")}
          value={fmtBRLDecimal(arr / 100)}
          subLabel={t("arr.subLabel")}
          icon={IconReceipt}
          color="text-violet-400"
          bgColor="bg-violet-600/20"
          current={arr}
          previous={data?.previousArr}
          tooltip={t("arr.tooltip")}
        />
        <KpiCard
          label={t("subscribers.label")}
          value={String(activeSubscriptions)}
          subLabel={t("subscribers.subLabel")}
          icon={IconUsers}
          color="text-amber-400"
          bgColor="bg-amber-600/20"
          current={activeSubscriptions}
          previous={data?.previousActiveSubscriptions}
          tooltip={t("subscribers.tooltip")}
        />
        <KpiCard
          label={t("arpu.label")}
          value={fmtBRLDecimal(arpu / 100)}
          subLabel={t("arpu.subLabel")}
          icon={IconHeartHandshake}
          color="text-indigo-400"
          bgColor="bg-indigo-600/20"
          current={arpu}
          previous={data?.previousArpu}
          tooltip={t("arpu.tooltip")}
        />
      </div>

      <BlockHeader label={t("periodHeader")} muted={t("periodMuted")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          hero
          label={t("periodRevenue.label")}
          value={fmtBRLDecimal(totalPeriodRevenue / 100)}
          subLabel={t("periodRevenue.subLabel", { count: totalPurchaseCount })}
          icon={IconZoomMoney}
          color="text-emerald-400"
          bgColor="bg-emerald-600/20"
          current={totalPeriodRevenue}
          previous={data?.previousPeriodRevenue}
          tooltip={t("periodRevenue.tooltip")}
        />
        <KpiCard
          label={t("renewals.label")}
          value={String(renewalSubscriptions)}
          subLabel={t("renewals.subLabel", { count: totalPurchaseCount })}
          icon={IconRefresh}
          color="text-sky-400"
          bgColor="bg-sky-600/20"
          tooltip={t("renewals.tooltip")}
        />
        <KpiCard
          label={t("nrr.label")}
          value={`${nrr}%`}
          subLabel={nrr >= 100 ? t("nrr.expansionExceedsChurn") : t("nrr.churnExceedsExpansion")}
          icon={isNrrPositive ? IconArrowUpRight : IconTrendingDown}
          color={isNrrPositive ? "text-emerald-400" : "text-rose-400"}
          bgColor={isNrrPositive ? "bg-emerald-600/20" : "bg-rose-600/20"}
          current={nrr}
          previous={data?.previousNrr}
          tooltip={t("nrr.tooltip")}
        />
      </div>

      <BlockHeader label={t("healthHeader")} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label={t("churnRate.label")}
          value={`${churnRate}%`}
          subLabel={t("churnRate.subLabel")}
          icon={IconAlertCircle}
          color="text-rose-400"
          bgColor="bg-rose-600/20"
          current={churnRate}
          previous={data?.previousChurnRate}
          invertColors
          tooltip={t("churnRate.tooltip")}
        />
        <KpiCard
          label={t("revenueChurn.label")}
          value={`${revenueChurnRate}%`}
          subLabel={t("revenueChurn.subLabel")}
          icon={IconTrendingDown}
          color="text-red-400"
          bgColor="bg-red-600/20"
          current={revenueChurnRate}
          previous={data?.previousRevenueChurnRate}
          invertColors
          tooltip={t("revenueChurn.tooltip")}
        />
        <KpiCard
          label={t("mrrGrowth.label")}
          value={`${mrrGrowthRate > 0 ? "+" : ""}${mrrGrowthRate}%`}
          subLabel={t("mrrGrowth.subLabel")}
          icon={isGrowthPositive ? IconChartBar : IconTrendingDown}
          color={isGrowthPositive ? "text-emerald-400" : "text-rose-400"}
          bgColor={isGrowthPositive ? "bg-emerald-600/20" : "bg-rose-600/20"}
          tooltip={t("mrrGrowth.tooltip")}
        />
        <KpiCard
          label={t("ltv.label")}
          value={fmtBRLDecimal(estimatedLtv / 100)}
          subLabel={t("ltv.subLabel")}
          icon={IconTrendingUp}
          color="text-indigo-400"
          bgColor="bg-indigo-600/20"
          current={estimatedLtv}
          previous={data?.previousEstimatedLtv}
          tooltip={t("ltv.tooltip")}
        />
      </div>

      <BlockHeader label={t("forecastHeader")} />
      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/20 shrink-0">
              <IconCalendarStats size={14} className="text-teal-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  {t("forecast.label")}
                </p>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 text-zinc-700 hover:text-zinc-400 transition-colors focus:outline-none"
                        aria-label={t("forecast.infoAriaLabel")}
                      >
                        <IconInfoCircle size={11} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-[220px] bg-zinc-800 border-zinc-700 text-zinc-200 text-xs leading-relaxed"
                    >
                      {t("forecast.tooltip")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                {t("forecast.renewalsExpected", { count: forecastNext30dCount })}
              </p>
            </div>
          </div>
          <span className="font-bold font-mono text-lg sm:text-xl text-teal-400 sm:text-right whitespace-nowrap">
            {fmtBRLDecimal(forecastNext30dRevenue / 100)}
          </span>
        </div>
      </div>
    </div>
  );
}
