"use client";

import { IFunnelData } from "@/interfaces/dashboard.interface";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconUsers,
  IconEdit,
  IconCreditCard,
  IconCurrencyDollar,
  IconReceipt,
  IconTrendingUp,
} from "@tabler/icons-react";

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
  data: IFunnelData | null | undefined;
  isLoading: boolean;
}

export function KpiCards({ data, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const cards: KpiCardProps[] = [
    {
      label: "Cadastros",
      value: String(data?.signups ?? 0),
      icon: IconUsers,
      color: "text-indigo-400",
      bgColor: "bg-indigo-600/20",
    },
    {
      label: "Edições",
      value: String(data?.edits ?? 0),
      icon: IconEdit,
      color: "text-violet-400",
      bgColor: "bg-violet-600/20",
    },
    {
      label: "Pagamentos",
      value: String(data?.payments ?? 0),
      icon: IconCreditCard,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
    },
    {
      label: "Receita",
      value: `R$ ${(data?.revenue ?? 0).toFixed(0)}`,
      icon: IconCurrencyDollar,
      color: "text-emerald-400",
      bgColor: "bg-emerald-600/20",
    },
    {
      label: "Ticket Médio",
      value: `R$ ${data?.ticket_medio ?? "0,00"}`,
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

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
