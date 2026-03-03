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
  IconMinus,
  IconArrowUpRight,
} from "@tabler/icons-react";
import type { IMrrOverview } from "@/interfaces/mrr.interface";

function computeVariation(current: number, previous: number) {
  const pct = ((current - previous) / previous) * 100;
  return { abs: Math.abs(pct), isUp: pct > 0 };
}

interface VariationBadgeProps {
  current: number;
  previous: number | undefined;
  invertColors?: boolean;
}

function VariationBadge({ current, previous, invertColors = false }: VariationBadgeProps) {
  if (!previous || previous === 0) return null;
  const { abs, isUp } = computeVariation(current, previous);
  if (abs < 0.5) {
    return (
      <span className="flex items-center gap-0.5 rounded-md bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-500">
        <IconMinus size={9} />
        0%
      </span>
    );
  }
  const positive = invertColors ? !isUp : isUp;
  return (
    <span
      className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium ${
        positive ? "bg-emerald-950/60 text-emerald-400" : "bg-rose-950/60 text-rose-400"
      }`}
    >
      {isUp ? <IconTrendingUp size={9} /> : <IconTrendingDown size={9} />}
      {isUp ? "+" : "-"}{abs.toFixed(1)}%
    </span>
  );
}

function BlockHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-0.5 pt-1">
      {label}
    </p>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  subLabel?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  current?: number;
  previous?: number;
  invertColors?: boolean;
  hero?: boolean;
}

function KpiCard({ label, value, subLabel, icon: Icon, color, bgColor, current, previous, invertColors, hero }: KpiCardProps) {
  const hasPrev = previous !== undefined && previous > 0 && current !== undefined;
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-1.5 ${hero ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 truncate">
          {label}
        </span>
        <div className={`flex h-6 w-6 items-center justify-center rounded-md shrink-0 ${bgColor}`}>
          <Icon size={12} className={color} />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className={`font-bold font-mono leading-none ${color} ${hero ? "text-3xl" : "text-xl"}`}>
          {value}
        </span>
        {hasPrev && current !== undefined && previous !== undefined && (
          <VariationBadge current={current} previous={previous} invertColors={invertColors} />
        )}
      </div>
      {hasPrev && (
        <p className="text-[10px] text-zinc-600 leading-tight truncate">
          Comparado ao período anterior
        </p>
      )}
      {!hasPrev && subLabel && (
        <p className="text-[10px] text-zinc-600 leading-tight">{subLabel}</p>
      )}
    </div>
  );
}

function SkeletonCard({ hero }: { hero?: boolean }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-1.5 ${hero ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20 bg-zinc-800" />
        <Skeleton className="h-6 w-6 rounded-md bg-zinc-800" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <Skeleton className={`bg-zinc-800 ${hero ? "h-9 w-36" : "h-6 w-24"}`} />
        <Skeleton className="h-4 w-10 bg-zinc-800 rounded-md" />
      </div>
      <Skeleton className="h-3 w-32 bg-zinc-800/60 rounded" />
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
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SkeletonCard hero />
          {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const mrr = data?.mrr ?? 0;
  const arr = data?.arr ?? 0;
  const activeSubscriptions = data?.activeSubscriptions ?? 0;
  const arpu = data?.arpu ?? 0;
  const churnRate = data?.churnRate ?? 0;
  const revenueChurnRate = data?.revenueChurnRate ?? 0;
  const estimatedLtv = data?.estimatedLtv ?? 0;
  const mrrGrowthRate = data?.mrrGrowthRate ?? 0;

  const isGrowthPositive = mrrGrowthRate >= 0;

  return (
    <div className="space-y-3">
      <BlockHeader label="Receita Recorrente" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          hero
          label="MRR"
          value={fmtBRLDecimal(mrr / 100)}
          subLabel="Receita Mensal Recorrente"
          icon={IconCurrencyDollar}
          color="text-emerald-400"
          bgColor="bg-emerald-600/20"
          current={mrr}
          previous={data?.previousMrr}
        />
        <KpiCard
          label="ARR"
          value={fmtBRLDecimal(arr / 100)}
          subLabel="MRR × 12"
          icon={IconReceipt}
          color="text-cyan-400"
          bgColor="bg-cyan-600/20"
          current={arr}
          previous={data?.previousArr}
        />
        <KpiCard
          label="Crescimento MRR"
          value={`${mrrGrowthRate > 0 ? "+" : ""}${mrrGrowthRate}%`}
          subLabel="Net MRR Growth Rate"
          icon={isGrowthPositive ? IconArrowUpRight : IconTrendingDown}
          color={isGrowthPositive ? "text-emerald-400" : "text-rose-400"}
          bgColor={isGrowthPositive ? "bg-emerald-600/20" : "bg-rose-600/20"}
        />
      </div>

      <BlockHeader label="Assinantes" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Assinantes"
          value={String(activeSubscriptions)}
          subLabel="Ativos agora"
          icon={IconUsers}
          color="text-violet-400"
          bgColor="bg-violet-600/20"
          current={activeSubscriptions}
          previous={data?.previousActiveSubscriptions}
        />
        <KpiCard
          label="ARPU"
          value={fmtBRLDecimal(arpu / 100)}
          subLabel="Por assinante/mês"
          icon={IconHeartHandshake}
          color="text-amber-400"
          bgColor="bg-amber-600/20"
          current={arpu}
          previous={data?.previousArpu}
        />
        <KpiCard
          label="LTV Est."
          value={fmtBRLDecimal(estimatedLtv / 100)}
          subLabel="Valor vitalício estimado"
          icon={IconTrendingUp}
          color="text-indigo-400"
          bgColor="bg-indigo-600/20"
          current={estimatedLtv}
          previous={data?.previousEstimatedLtv}
        />
      </div>

      <BlockHeader label="Saúde" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <KpiCard
          label="Churn Rate"
          value={`${churnRate}%`}
          subLabel="Assinantes cancelados"
          icon={IconAlertCircle}
          color="text-rose-400"
          bgColor="bg-rose-600/20"
          current={churnRate}
          previous={data?.previousChurnRate}
          invertColors
        />
        <KpiCard
          label="Churn Receita"
          value={`${revenueChurnRate}%`}
          subLabel="MRR perdido"
          icon={IconTrendingDown}
          color="text-red-400"
          bgColor="bg-red-600/20"
          current={revenueChurnRate}
          previous={data?.previousRevenueChurnRate}
          invertColors
        />
      </div>
    </div>
  );
}
