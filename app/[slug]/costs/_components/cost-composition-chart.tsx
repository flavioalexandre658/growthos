"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal } from "@/utils/format";
import type { ICostsSummary } from "@/interfaces/cost.interface";

interface CostCompositionChartProps {
  data: ICostsSummary | undefined;
  isLoading: boolean;
}

interface Segment {
  label: string;
  value: number;
  color: string;
  bgColor: string;
  textColor: string;
}

export function CostCompositionChart({ data, isLoading }: CostCompositionChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <Skeleton className="h-4 w-40 bg-zinc-800 mb-4" />
        <Skeleton className="h-8 w-full rounded-full bg-zinc-800 mb-3" />
        <div className="flex gap-4 flex-wrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-28 bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  const gross = (data?.grossRevenueInCents ?? 0) / 100;
  const fixedCosts = (data?.totalFixedCostsInCents ?? 0) / 100;
  const varCosts = (data?.totalVariableCostsInCents ?? 0) / 100;
  const remaining = Math.max(0, gross - fixedCosts - varCosts);

  if (gross === 0 && fixedCosts === 0 && varCosts === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-bold text-zinc-100 mb-1">Composição de Custos</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Proporção visual de custos sobre a receita do mês atual
        </p>
        <div className="flex items-center justify-center h-10 rounded-full bg-zinc-800/50 border border-zinc-700/40">
          <span className="text-xs text-zinc-600">Sem dados para o período</span>
        </div>
      </div>
    );
  }

  const total = fixedCosts + varCosts + remaining;
  const segments: Segment[] = [
    {
      label: "Custos Variáveis",
      value: varCosts,
      color: "#f97316",
      bgColor: "bg-orange-500",
      textColor: "text-orange-400",
    },
    {
      label: "Custos Fixos",
      value: fixedCosts,
      color: "#ef4444",
      bgColor: "bg-red-500",
      textColor: "text-red-400",
    },
    {
      label: "Sobra / Margem",
      value: remaining,
      color: "#22c55e",
      bgColor: "bg-emerald-500",
      textColor: "text-emerald-400",
    },
  ].filter((s) => s.value > 0);

  const getWidth = (value: number) =>
    total > 0 ? `${Math.max(1, (value / total) * 100).toFixed(1)}%` : "0%";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100 mb-1">Composição de Custos</h3>
      <p className="text-xs text-zinc-500 mb-4">
        Proporção visual de custos sobre a receita do mês atual ({fmtBRLDecimal(gross)})
      </p>

      <div className="flex h-8 w-full rounded-lg overflow-hidden gap-0.5 mb-4">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={`${seg.bgColor} opacity-80 transition-all h-full flex items-center justify-center`}
            style={{ width: getWidth(seg.value) }}
            title={`${seg.label}: ${fmtBRLDecimal(seg.value)}`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((seg) => {
          const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : "0";
          return (
            <div key={seg.label} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm shrink-0"
                style={{ background: seg.color }}
              />
              <span className="text-[11px] text-zinc-400">{seg.label}</span>
              <span className={`text-[11px] font-mono font-semibold ${seg.textColor}`}>
                {fmtBRLDecimal(seg.value)}
              </span>
              <span className="text-[10px] text-zinc-600">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
