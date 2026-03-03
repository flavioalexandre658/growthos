"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal } from "@/utils/format";
import {
  IconTrendingDown,
  IconCurrencyDollar,
  IconReceipt,
  IconPercentage,
  IconWallet,
} from "@tabler/icons-react";
import type { ICostsSummary } from "@/interfaces/cost.interface";

interface ImpactCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function ImpactCard({ label, value, sub, icon: Icon, color, bgColor }: ImpactCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          {label}
        </span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bgColor}`}>
          <Icon size={14} className={color} />
        </div>
      </div>
      <span className={`text-xl font-bold font-mono ${color}`}>{value}</span>
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
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ImpactCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const fixedTotal = fmtBRLDecimal((data?.totalFixedCostsInCents ?? 0) / 100);
  const varTotal = fmtBRLDecimal((data?.totalVariableCostsInCents ?? 0) / 100);
  const costTotal = fmtBRLDecimal((data?.totalCostsInCents ?? 0) / 100);
  const impact = data?.impactPercent ?? 0;
  const margin = data?.marginPercent ?? 0;
  const grossRev = fmtBRLDecimal((data?.grossRevenueInCents ?? 0) / 100);

  const cards: ImpactCardProps[] = [
    {
      label: "Custos Fixos / mês",
      value: fixedTotal,
      sub: "despesas mensais fixas",
      icon: IconReceipt,
      color: "text-red-400",
      bgColor: "bg-red-600/20",
    },
    {
      label: "Custos Variáveis",
      value: varTotal,
      sub: `sobre ${grossRev} em receita`,
      icon: IconTrendingDown,
      color: "text-orange-400",
      bgColor: "bg-orange-600/20",
    },
    {
      label: "Custo Total",
      value: costTotal,
      sub: "fixos + variáveis",
      icon: IconWallet,
      color: "text-amber-400",
      bgColor: "bg-amber-600/20",
    },
    {
      label: "Impacto na Margem",
      value: `${impact.toFixed(1).replace(".", ",")}%`,
      sub: `margem líquida: ${margin.toFixed(1).replace(".", ",")}%`,
      icon: IconPercentage,
      color: impact > 50 ? "text-red-400" : impact > 25 ? "text-orange-400" : "text-emerald-400",
      bgColor: impact > 50 ? "bg-red-600/20" : impact > 25 ? "bg-orange-600/20" : "bg-emerald-600/20",
    },
    {
      label: "Receita Bruta (mês)",
      value: grossRev,
      sub: "base de cálculo dos custos",
      icon: IconCurrencyDollar,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((card) => (
        <ImpactCard key={card.label} {...card} />
      ))}
    </div>
  );
}
