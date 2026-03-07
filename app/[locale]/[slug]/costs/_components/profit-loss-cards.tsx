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
  IconCurrencyDollar,
  IconWallet,
  IconReceipt,
  IconPercentage,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { IProfitAndLoss } from "@/interfaces/cost.interface";

interface PLCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  subLabel?: string;
  tooltip: string;
}

function PLCard({ label, value, icon: Icon, color, bgColor, subLabel, tooltip }: PLCardProps) {
  const t = useTranslations("finance.profitLossCards");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 truncate">
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
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${bgColor}`}>
          <Icon size={14} className={color} />
        </div>
      </div>
      <span className={`text-lg sm:text-2xl font-bold font-mono whitespace-nowrap ${color}`}>{value}</span>
      {subLabel && <span className="text-[10px] text-zinc-600">{subLabel}</span>}
    </div>
  );
}

function PLCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24 bg-zinc-800" />
        <Skeleton className="h-7 w-7 rounded-lg bg-zinc-800" />
      </div>
      <Skeleton className="h-8 w-36 bg-zinc-800" />
    </div>
  );
}

interface ProfitLossCardsProps {
  pl: IProfitAndLoss | null;
  isLoading: boolean;
}

export function ProfitLossCards({ pl, isLoading }: ProfitLossCardsProps) {
  const t = useTranslations("finance.profitLossCards");

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <PLCardSkeleton key={i} />)}
      </div>
    );
  }

  const cards: PLCardProps[] = [
    {
      label: t("grossRevenue"),
      value: fmtBRLDecimal((pl?.grossRevenueInCents ?? 0) / 100),
      icon: IconCurrencyDollar,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
      tooltip: t("grossRevenueTooltip"),
    },
    {
      label: t("variableCosts"),
      value: fmtBRLDecimal((pl?.totalVariableCostsInCents ?? 0) / 100),
      icon: IconReceipt,
      color: "text-orange-400",
      bgColor: "bg-orange-600/20",
      subLabel: t("variableCostsSubLabel", { count: pl?.variableCostsBreakdown.length ?? 0 }),
      tooltip: t("variableCostsTooltip"),
    },
    {
      label: t("operatingProfit"),
      value: fmtBRLDecimal((pl?.operatingProfitInCents ?? 0) / 100),
      icon: IconWallet,
      color: "text-cyan-400",
      bgColor: "bg-cyan-600/20",
      subLabel: t("operatingProfitSubLabel"),
      tooltip: t("operatingProfitTooltip"),
    },
    {
      label: t("fixedCosts"),
      value: fmtBRLDecimal((pl?.totalFixedCostsInCents ?? 0) / 100),
      icon: IconTrendingDown,
      color: "text-red-400",
      bgColor: "bg-red-600/20",
      subLabel: pl?.periodDays && pl.periodDays < 30
        ? t("fixedCostsSubLabelProrated", { count: pl.fixedCostsBreakdown.length ?? 0, days: pl.periodDays })
        : t("fixedCostsSubLabel", { count: pl?.fixedCostsBreakdown.length ?? 0 }),
      tooltip: t("fixedCostsTooltip"),
    },
    {
      label: t("netProfit"),
      value: fmtBRLDecimal((pl?.netProfitInCents ?? 0) / 100),
      icon: (pl?.netProfitInCents ?? 0) >= 0 ? IconTrendingUp : IconTrendingDown,
      color: (pl?.netProfitInCents ?? 0) >= 0 ? "text-indigo-400" : "text-red-400",
      bgColor: (pl?.netProfitInCents ?? 0) >= 0 ? "bg-indigo-600/20" : "bg-red-600/20",
      subLabel: t("netProfitSubLabel"),
      tooltip: t("netProfitTooltip"),
    },
    {
      label: t("netMargin"),
      value: `${pl?.marginPercent ?? 0}%`,
      icon: IconPercentage,
      color: (pl?.marginPercent ?? 0) >= 0 ? "text-amber-400" : "text-red-400",
      bgColor: (pl?.marginPercent ?? 0) >= 0 ? "bg-amber-600/20" : "bg-red-600/20",
      tooltip: t("netMarginTooltip"),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => <PLCard key={card.label} {...card} />)}
    </div>
  );
}
