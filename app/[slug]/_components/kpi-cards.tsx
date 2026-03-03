"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { fmtInt, fmtBRLDecimal } from "@/utils/format";
import {
  IconCurrencyDollar,
  IconReceipt,
  IconUsers,
  IconEdit,
  IconCreditCard,
  IconChartBar,
  IconEye,
  IconShoppingCart,
  IconShoppingCartX,
} from "@tabler/icons-react";
import type { IGenericFunnelData } from "@/interfaces/dashboard.interface";
import { getStepColor } from "@/utils/step-colors";

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
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function KpiCard({ label, value, icon: Icon, color, bgColor }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          {label}
        </span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bgColor}`}>
          <Icon size={14} className={color} />
        </div>
      </div>
      <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20 bg-zinc-800" />
        <Skeleton className="h-7 w-7 rounded-lg bg-zinc-800" />
      </div>
      <Skeleton className="h-8 w-28 bg-zinc-800" />
    </div>
  );
}

interface KpiCardsProps {
  data: IGenericFunnelData | null | undefined;
  isLoading: boolean;
  hiddenKeys?: Set<string>;
}

export function KpiCards({ data, isLoading, hiddenKeys }: KpiCardsProps) {
  const visibleSteps = (data?.steps ?? []).filter((s) => !hiddenKeys?.has(s.key));
  const stepCount = visibleSteps.length || (data?.steps.length ?? 3);
  const totalCards = stepCount + 3 + ((data?.checkoutAbandoned ?? 0) > 0 ? 1 : 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: totalCards }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const allStepKeys = (data?.steps ?? [])
    .filter((s) => s.key !== "pageview")
    .map((s) => s.key);

  const stepCards: KpiCardProps[] = visibleSteps.map((step) => {
    const { text, bg } = getStepColor(step.key, allStepKeys);
    const Icon = STEP_ICON_MAP[step.key] ?? FALLBACK_ICON;
    return {
      label: step.label,
      value: fmtInt(step.value),
      icon: Icon,
      color: text,
      bgColor: bg,
    };
  });

  const metricCards: KpiCardProps[] = [
    {
      label: "Receita",
      value: fmtBRLDecimal((data?.revenue ?? 0) / 100),
      icon: IconCurrencyDollar,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
    },
    {
      label: "Ticket Médio",
      value: data?.ticketMedio ?? "R$ 0,00",
      icon: IconReceipt,
      color: "text-amber-400",
      bgColor: "bg-amber-600/20",
    },
  ];

  const abandonedCards: KpiCardProps[] =
    (data?.checkoutAbandoned ?? 0) > 0
      ? [
          {
            label: "Abandonos",
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
