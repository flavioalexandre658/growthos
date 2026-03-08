"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fmtInt, fmtBRLDecimal } from "@/utils/format";
import { getStepColor } from "@/utils/step-colors";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconCurrencyDollar,
  IconReceipt,
  IconUsers,
  IconEdit,
  IconCreditCard,
  IconChartBar,
  IconEye,
  IconShoppingCart,
  IconShoppingCartX,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { IGenericFunnelData } from "@/interfaces/dashboard.interface";
import { useTranslations } from "next-intl";

const STEP_ICON_MAP: Record<string, React.ElementType> = {
  pageview: IconEye,
  signup: IconUsers,
  signups: IconUsers,
  edits: IconEdit,
  payment: IconCreditCard,
  payments: IconCreditCard,
  campaigns: IconChartBar,
  checkout_started: IconShoppingCart,
};


const FALLBACK_ICON = IconChartBar;

interface KpiCardProps {
  label: string;
  value: string;
  previousLabel?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  current?: number;
  previous?: number;
  tooltip?: string;
}

function computeVariation(current: number, previous: number) {
  const pct = ((current - previous) / previous) * 100;
  return { pct, abs: Math.abs(pct), isUp: pct > 0 };
}

function KpiCard({ label, value, previousLabel, icon: Icon, color, bgColor, current, previous, tooltip }: KpiCardProps) {
  const t = useTranslations("dashboard.kpi");
  const hasPrev = previous !== undefined && previous > 0 && current !== undefined;
  const variation = hasPrev ? computeVariation(current!, previous!) : null;

  const variationBadge = variation ? (
    variation.abs < 0.5 ? (
      <span className="flex items-center gap-0.5 rounded-md bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-500">
        <IconMinus size={9} />
        0%
      </span>
    ) : (
      <span
        className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium ${
          variation.isUp
            ? "bg-emerald-950/60 text-emerald-400"
            : "bg-rose-950/60 text-rose-400"
        }`}
      >
        {variation.isUp ? <IconTrendingUp size={9} /> : <IconTrendingDown size={9} />}
        {variation.isUp ? "+" : "-"}{variation.abs.toFixed(1)}%
      </span>
    )
  ) : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-1 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-tight sm:tracking-widest text-zinc-500 truncate min-w-0">
            {label}
          </span>
          {tooltip && (
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
          )}
        </div>
        <div className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md shrink-0 ${bgColor}`}>
          <Icon size={11} className={color} />
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className={`text-base sm:text-xl font-bold font-mono leading-none whitespace-nowrap ${color}`}>{value}</span>
        {variationBadge}
      </div>

      {hasPrev && previousLabel && (
        <p className="text-[9px] sm:text-[10px] text-zinc-600 leading-tight truncate">
          {t("vsPrevious", { previousLabel })}
        </p>
      )}
      {!hasPrev && (
        <p className="text-[9px] sm:text-[10px] text-zinc-700 leading-tight">—</p>
      )}
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20 bg-zinc-800" />
        <Skeleton className="h-6 w-6 rounded-md bg-zinc-800" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <Skeleton className="h-7 w-24 bg-zinc-800" />
        <Skeleton className="h-4 w-10 bg-zinc-800 rounded-md" />
      </div>
      <Skeleton className="h-3 w-32 bg-zinc-800/60 rounded" />
    </div>
  );
}

interface KpiCardsProps {
  data: IGenericFunnelData | null | undefined;
  isLoading: boolean;
  hiddenKeys?: Set<string>;
}

export function KpiCards({ data, isLoading, hiddenKeys }: KpiCardsProps) {
  const t = useTranslations("dashboard.kpi");
  const allStepKeys = (data?.steps ?? [])
    .filter((s) => s.key !== "pageview")
    .map((s) => s.key);

  const visibleSteps = (data?.steps ?? []).filter((s) => !hiddenKeys?.has(s.key));
  const stepCount = visibleSteps.length || (data?.steps.length ?? 3);
  const totalCards = stepCount + 2 + ((data?.checkoutAbandoned ?? 0) > 0 ? 1 : 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: totalCards }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const prevMap = new Map(
    (data?.previousSteps ?? []).map((s) => [s.key, s.value])
  );

  const stepCards: KpiCardProps[] = visibleSteps.map((step) => {
    const { text, bg } = getStepColor(step.key, allStepKeys);
    const Icon = STEP_ICON_MAP[step.key] ?? FALLBACK_ICON;
    const prev = prevMap.get(step.key);
    return {
      label: step.label,
      value: fmtInt(step.value),
      previousLabel: prev !== undefined ? fmtInt(prev) : undefined,
      icon: Icon,
      color: text,
      bgColor: bg,
      current: step.value,
      previous: prev,
      tooltip: undefined,
    };
  });

  const prevRevenue = data?.previousRevenue;
  const metricCards: KpiCardProps[] = [
    {
      label: t("revenue"),
      value: fmtBRLDecimal((data?.revenue ?? 0) / 100),
      previousLabel: prevRevenue !== undefined ? fmtBRLDecimal(prevRevenue / 100) : undefined,
      icon: IconCurrencyDollar,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
      current: data?.revenue ?? 0,
      previous: prevRevenue,
    },
    {
      label: t("averageTicket"),
      value: data?.ticketMedio ?? "R$ 0,00",
      icon: IconReceipt,
      color: "text-amber-400",
      bgColor: "bg-amber-600/20",
      tooltip: t("averageTicketTooltip"),
    },
  ];

  const abandonedCards: KpiCardProps[] =
    (data?.checkoutAbandoned ?? 0) > 0
      ? [
          {
            label: t("abandoned"),
            value: fmtInt(data?.checkoutAbandoned ?? 0),
            icon: IconShoppingCartX,
            color: "text-rose-400",
            bgColor: "bg-rose-600/20",
          },
        ]
      : [];

  const allCards = [...stepCards, ...metricCards, ...abandonedCards];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {allCards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
