"use client";

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRL } from "@/utils/format";
import type { IProfitAndLoss } from "@/interfaces/cost.interface";

interface WaterfallEntry {
  name: string;
  value: number;
  base: number;
  color: string;
}

function buildWaterfallData(pl: IProfitAndLoss): WaterfallEntry[] {
  const gross = pl.grossRevenueInCents / 100;
  const fixedTotal = pl.totalFixedCostsInCents / 100;
  const varTotal = pl.totalVariableCostsInCents / 100;
  const real = pl.realProfitInCents / 100;

  return [
    { name: "Receita Bruta", value: gross, base: 0, color: "#22c55e" },
    { name: "- Custos Fixos", value: fixedTotal, base: gross - fixedTotal, color: "#ef4444" },
    { name: "- Custos Var.", value: varTotal, base: gross - fixedTotal - varTotal, color: "#f97316" },
    { name: "Lucro Real", value: Math.abs(real), base: 0, color: real >= 0 ? "#6366f1" : "#ef4444" },
  ];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: WaterfallEntry }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs">
      <p className="text-zinc-400 mb-1">{entry.name}</p>
      <p className="font-bold font-mono text-zinc-100">{fmtBRL(entry.value)}</p>
    </div>
  );
}

interface ProfitLossWaterfallProps {
  pl: IProfitAndLoss | null;
  isLoading: boolean;
}

export function ProfitLossWaterfall({ pl, isLoading }: ProfitLossWaterfallProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <Skeleton className="h-4 w-40 bg-zinc-800 mb-4" />
        <Skeleton className="h-48 w-full bg-zinc-800 rounded-lg" />
      </div>
    );
  }

  if (!pl) return null;

  const data = buildWaterfallData(pl);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100 mb-1">Composição do Resultado</h3>
      <p className="text-xs text-zinc-500 mb-4">Receita → Custos → Lucro Real</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={48}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <ReferenceLine y={0} stroke="#3f3f46" />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
