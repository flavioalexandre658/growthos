"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRL, fmtBRLDecimal } from "@/utils/format";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconCurrencyDollar,
  IconWallet,
  IconReceipt,
  IconPercentage,
} from "@tabler/icons-react";
import type { IProfitAndLoss } from "@/interfaces/cost.interface";

interface PLCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  subLabel?: string;
}

function PLCard({ label, value, icon: Icon, color, bgColor, subLabel }: PLCardProps) {
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
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <PLCardSkeleton key={i} />)}
      </div>
    );
  }

  const cards: PLCardProps[] = [
    {
      label: "Receita Bruta",
      value: fmtBRL((pl?.grossRevenueInCents ?? 0) / 100),
      icon: IconCurrencyDollar,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
    },
    {
      label: "Custos Fixos",
      value: fmtBRL((pl?.totalFixedCostsInCents ?? 0) / 100),
      icon: IconTrendingDown,
      color: "text-red-400",
      bgColor: "bg-red-600/20",
      subLabel: `${pl?.fixedCostsBreakdown.length ?? 0} itens`,
    },
    {
      label: "Custos Variáveis",
      value: fmtBRL((pl?.totalVariableCostsInCents ?? 0) / 100),
      icon: IconReceipt,
      color: "text-orange-400",
      bgColor: "bg-orange-600/20",
      subLabel: `${pl?.variableCostsBreakdown.length ?? 0} itens`,
    },
    {
      label: "Lucro Bruto",
      value: fmtBRL((pl?.grossProfitInCents ?? 0) / 100),
      icon: IconWallet,
      color: "text-cyan-400",
      bgColor: "bg-cyan-600/20",
      subLabel: "Receita - Var.",
    },
    {
      label: "Lucro Real",
      value: fmtBRL((pl?.realProfitInCents ?? 0) / 100),
      icon: (pl?.realProfitInCents ?? 0) >= 0 ? IconTrendingUp : IconTrendingDown,
      color: (pl?.realProfitInCents ?? 0) >= 0 ? "text-indigo-400" : "text-red-400",
      bgColor: (pl?.realProfitInCents ?? 0) >= 0 ? "bg-indigo-600/20" : "bg-red-600/20",
      subLabel: "Receita - Fixos - Var.",
    },
    {
      label: "Margem Real",
      value: `${pl?.marginPercent ?? 0}%`,
      icon: IconPercentage,
      color: (pl?.marginPercent ?? 0) >= 0 ? "text-amber-400" : "text-red-400",
      bgColor: (pl?.marginPercent ?? 0) >= 0 ? "bg-amber-600/20" : "bg-red-600/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => <PLCard key={card.label} {...card} />)}
    </div>
  );
}
