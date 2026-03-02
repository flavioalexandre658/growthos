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

const STEP_COLOR_MAP: Record<string, { color: string; bgColor: string }> = {
  pageview: { color: "text-blue-400", bgColor: "bg-blue-600/20" },
  signup: { color: "text-indigo-400", bgColor: "bg-indigo-600/20" },
  signups: { color: "text-indigo-400", bgColor: "bg-indigo-600/20" },
  edits: { color: "text-violet-400", bgColor: "bg-violet-600/20" },
  payment: { color: "text-emerald-400", bgColor: "bg-emerald-600/20" },
  payments: { color: "text-emerald-400", bgColor: "bg-emerald-600/20" },
  campaigns: { color: "text-amber-400", bgColor: "bg-amber-600/20" },
  checkout_started: { color: "text-orange-400", bgColor: "bg-orange-600/20" },
};

const FALLBACK_ICON = IconChartBar;
const FALLBACK_COLORS = { color: "text-zinc-400", bgColor: "bg-zinc-700/30" };

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
}

export function KpiCards({ data, isLoading }: KpiCardsProps) {
  const stepCount = data?.steps.length ?? 3;
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

  const stepCards: KpiCardProps[] = (data?.steps ?? []).map((step) => {
    const colors = STEP_COLOR_MAP[step.key] ?? FALLBACK_COLORS;
    const Icon = STEP_ICON_MAP[step.key] ?? FALLBACK_ICON;
    return {
      label: step.label,
      value: fmtInt(step.value),
      icon: Icon,
      ...colors,
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
