"use client";

import { IFunnelData } from "@/interfaces/dashboard.interface";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRL, fmtBRLDecimal } from "@/utils/format";
import {
  IconCurrencyDollar,
  IconWallet,
  IconPercentage,
  IconReceipt,
} from "@tabler/icons-react";

interface FinanceKpiCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function FinanceKpiCard({ label, value, icon: Icon, color, bgColor }: FinanceKpiCardProps) {
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

interface FinanceKpiCardsProps {
  data: IFunnelData | null | undefined;
  isLoading: boolean;
}

export function FinanceKpiCards({ data, isLoading }: FinanceKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
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

  const cards: FinanceKpiCardProps[] = [
    {
      label: "Receita Bruta",
      value: fmtBRL(data?.revenue),
      icon: IconCurrencyDollar,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
    },
    {
      label: "Receita Líquida",
      value: fmtBRL(data?.net_revenue),
      icon: IconWallet,
      color: "text-cyan-400",
      bgColor: "bg-cyan-600/20",
    },
    {
      label: "Margem",
      value: `${data?.margin ?? 0}%`,
      icon: IconPercentage,
      color: "text-amber-400",
      bgColor: "bg-amber-600/20",
    },
    {
      label: "Ticket Médio",
      value: fmtBRLDecimal(data?.ticket_medio),
      icon: IconReceipt,
      color: "text-violet-400",
      bgColor: "bg-violet-600/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <FinanceKpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
