"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal } from "@/utils/format";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconUsers,
  IconReceipt,
  IconAlertCircle,
  IconCurrencyDollar,
  IconHeartHandshake,
} from "@tabler/icons-react";
import type { IMrrOverview } from "@/interfaces/mrr.interface";

interface MrrKpiCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  subLabel?: string;
}

function MrrKpiCard({ label, value, icon: Icon, color, bgColor, subLabel }: MrrKpiCardProps) {
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
      {subLabel && <span className="text-[10px] text-zinc-600">{subLabel}</span>}
    </div>
  );
}

interface MrrKpiCardsProps {
  data: IMrrOverview | null | undefined;
  isLoading: boolean;
}

export function MrrKpiCards({ data, isLoading }: MrrKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24 bg-zinc-800" />
              <Skeleton className="h-7 w-7 rounded-lg bg-zinc-800" />
            </div>
            <Skeleton className="h-8 w-36 bg-zinc-800" />
          </div>
        ))}
      </div>
    );
  }

  const growthRate = data?.mrrGrowthRate ?? 0;
  const GrowthIcon = growthRate >= 0 ? IconTrendingUp : IconTrendingDown;
  const growthColor = growthRate >= 0 ? "text-emerald-400" : "text-red-400";
  const growthBg = growthRate >= 0 ? "bg-emerald-600/20" : "bg-red-600/20";

  const cards: MrrKpiCardProps[] = [
    {
      label: "MRR",
      value: fmtBRLDecimal((data?.mrr ?? 0) / 100),
      icon: IconCurrencyDollar,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
      subLabel: "Receita Mensal Recorrente",
    },
    {
      label: "ARR",
      value: fmtBRLDecimal((data?.arr ?? 0) / 100),
      icon: IconReceipt,
      color: "text-cyan-400",
      bgColor: "bg-cyan-600/20",
      subLabel: "MRR × 12",
    },
    {
      label: "Assinantes",
      value: String(data?.activeSubscriptions ?? 0),
      icon: IconUsers,
      color: "text-violet-400",
      bgColor: "bg-violet-600/20",
      subLabel: "Ativos agora",
    },
    {
      label: "ARPU",
      value: fmtBRLDecimal((data?.arpu ?? 0) / 100),
      icon: IconHeartHandshake,
      color: "text-amber-400",
      bgColor: "bg-amber-600/20",
      subLabel: "Por assinante/mês",
    },
    {
      label: "Churn Rate",
      value: `${data?.churnRate ?? 0}%`,
      icon: IconAlertCircle,
      color: "text-red-400",
      bgColor: "bg-red-600/20",
      subLabel: "Assinantes cancelados",
    },
    {
      label: "Churn Receita",
      value: `${data?.revenueChurnRate ?? 0}%`,
      icon: IconTrendingDown,
      color: "text-rose-400",
      bgColor: "bg-rose-600/20",
      subLabel: "MRR perdido",
    },
    {
      label: "LTV Est.",
      value: fmtBRLDecimal((data?.estimatedLtv ?? 0) / 100),
      icon: GrowthIcon,
      color: growthColor,
      bgColor: growthBg,
      subLabel: `Crescimento: ${growthRate > 0 ? "+" : ""}${growthRate}%`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
      {cards.map((card) => (
        <MrrKpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
