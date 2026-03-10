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
  IconTrendingDown,
  IconCurrencyDollar,
  IconReceipt,
  IconPercentage,
  IconWallet,
  IconInfoCircle,
  IconSpeakerphone,
} from "@tabler/icons-react";
import type { ICostsSummary } from "@/interfaces/cost.interface";

interface ImpactCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  tooltip: string;
  ariaLabel: string;
}

function ImpactCard({ label, value, sub, icon: Icon, color, bgColor, tooltip, ariaLabel }: ImpactCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-2">
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
                  aria-label={ariaLabel}
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
      <span className={`text-base sm:text-lg font-bold font-mono whitespace-nowrap ${color}`}>{value}</span>
      <span className="text-[10px] text-zinc-600">{sub}</span>
    </div>
  );
}

function ImpactCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24 bg-zinc-800" />
        <Skeleton className="h-7 w-7 rounded-lg bg-zinc-800" />
      </div>
      <Skeleton className="h-6 w-32 bg-zinc-800" />
      <Skeleton className="h-3 w-20 bg-zinc-800" />
    </div>
  );
}

interface CostsImpactCardsProps {
  data: ICostsSummary | undefined;
  isLoading: boolean;
}

export function CostsImpactCards({ data, isLoading }: CostsImpactCardsProps) {
  const t = useTranslations("finance.costsImpact");

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ImpactCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const fixedTotal = fmtBRLDecimal((data?.totalFixedCostsInCents ?? 0) / 100);
  const varTotal = fmtBRLDecimal((data?.totalVariableCostsInCents ?? 0) / 100);
  const marketingTotal = fmtBRLDecimal((data?.totalMarketingSpendInCents ?? 0) / 100);
  const costTotal = fmtBRLDecimal((data?.totalCostsInCents ?? 0) / 100);
  const impact = data?.impactPercent ?? 0;
  const margin = data?.marginPercent ?? 0;
  const grossRev = fmtBRLDecimal((data?.grossRevenueInCents ?? 0) / 100);

  const cards: ImpactCardProps[] = [
    {
      label: t("fixedLabel"),
      value: fixedTotal,
      sub: t("fixedSub"),
      icon: IconReceipt,
      color: "text-red-400",
      bgColor: "bg-red-600/20",
      tooltip: t("fixedTooltip"),
      ariaLabel: t("infoAriaLabel", { label: t("fixedLabel") }),
    },
    {
      label: t("variableLabel"),
      value: varTotal,
      sub: t("variableSub", { value: grossRev }),
      icon: IconTrendingDown,
      color: "text-orange-400",
      bgColor: "bg-orange-600/20",
      tooltip: t("variableTooltip"),
      ariaLabel: t("infoAriaLabel", { label: t("variableLabel") }),
    },
    {
      label: t("marketingLabel"),
      value: marketingTotal,
      sub: t("marketingSub"),
      icon: IconSpeakerphone,
      color: "text-violet-400",
      bgColor: "bg-violet-600/20",
      tooltip: t("marketingTooltip"),
      ariaLabel: t("infoAriaLabel", { label: t("marketingLabel") }),
    },
    {
      label: t("totalLabel"),
      value: costTotal,
      sub: t("totalSub"),
      icon: IconWallet,
      color: "text-amber-400",
      bgColor: "bg-amber-600/20",
      tooltip: t("totalTooltip"),
      ariaLabel: t("infoAriaLabel", { label: t("totalLabel") }),
    },
    {
      label: t("marginImpactLabel"),
      value: `${impact.toFixed(1).replace(".", ",")}%`,
      sub: t("marginImpactSub", { value: margin.toFixed(1).replace(".", ",") }),
      icon: IconPercentage,
      color: impact > 50 ? "text-red-400" : impact > 25 ? "text-orange-400" : "text-emerald-400",
      bgColor: impact > 50 ? "bg-red-600/20" : impact > 25 ? "bg-orange-600/20" : "bg-emerald-600/20",
      tooltip: t("marginImpactTooltip"),
      ariaLabel: t("infoAriaLabel", { label: t("marginImpactLabel") }),
    },
    {
      label: t("grossLabel"),
      value: grossRev,
      sub: t("grossSub"),
      icon: IconCurrencyDollar,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
      tooltip: t("grossTooltip"),
      ariaLabel: t("infoAriaLabel", { label: t("grossLabel") }),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <ImpactCard key={card.label} {...card} />
      ))}
    </div>
  );
}
