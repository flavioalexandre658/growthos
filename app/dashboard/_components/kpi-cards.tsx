"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { fmtInt, fmtBRL, fmtBRLDecimal } from "@/utils/format";
import {
  IconCurrencyDollar,
  IconReceipt,
  IconTrendingUp,
  IconUsers,
  IconEdit,
  IconCreditCard,
  IconChartBar,
} from "@tabler/icons-react";
import type { IGenericFunnelData } from "@/interfaces/dashboard.interface";

const STEP_ICON_MAP: Record<string, React.ElementType> = {
  signups: IconUsers,
  edits: IconEdit,
  payments: IconCreditCard,
  campaigns: IconChartBar,
};

const STEP_COLOR_MAP: Record<string, { color: string; bgColor: string }> = {
  signups: { color: "text-indigo-400", bgColor: "bg-indigo-600/20" },
  edits: { color: "text-violet-400", bgColor: "bg-violet-600/20" },
  payments: { color: "text-emerald-400", bgColor: "bg-emerald-600/20" },
  campaigns: { color: "text-amber-400", bgColor: "bg-amber-600/20" },
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
  const totalCards = stepCount + 3;

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
      value: fmtBRL(data?.revenue),
      icon: IconCurrencyDollar,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
    },
    {
      label: "Ticket Médio",
      value: fmtBRLDecimal(data?.ticketMedio),
      icon: IconReceipt,
      color: "text-amber-400",
      bgColor: "bg-amber-600/20",
    },
    {
      label: "Margem",
      value: `${data?.margin ?? 0}%`,
      icon: IconTrendingUp,
      color: "text-cyan-400",
      bgColor: "bg-cyan-600/20",
    },
  ];

  const allCards = [...stepCards, ...metricCards];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {allCards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
