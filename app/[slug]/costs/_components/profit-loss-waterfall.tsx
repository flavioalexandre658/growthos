"use client";

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal } from "@/utils/format";
import type { IProfitAndLoss } from "@/interfaces/cost.interface";

interface WaterfallEntry {
  name: string;
  value: number;
  displayValue: number;
  color: string;
  isNegative: boolean;
}

function buildData(pl: IProfitAndLoss): WaterfallEntry[] {
  const gross = pl.grossRevenueInCents / 100;
  const eventCosts = Math.abs(pl.eventCostsInCents / 100);
  const varTotal = Math.abs(pl.totalVariableCostsInCents / 100);
  const opProfit = pl.operatingProfitInCents / 100;
  const fixedTotal = Math.abs(pl.totalFixedCostsInCents / 100);
  const net = pl.netProfitInCents / 100;

  return [
    { name: "Receita", value: gross, displayValue: gross, color: "#22c55e", isNegative: false },
    { name: "Descontos", value: eventCosts, displayValue: eventCosts, color: "#f43f5e", isNegative: true },
    { name: "Custos Var.", value: varTotal, displayValue: varTotal, color: "#f97316", isNegative: true },
    { name: "Lucro Op.", value: Math.abs(opProfit), displayValue: opProfit, color: opProfit >= 0 ? "#06b6d4" : "#ef4444", isNegative: opProfit < 0 },
    { name: "Custos Fixos", value: fixedTotal, displayValue: fixedTotal, color: "#ef4444", isNegative: true },
    { name: "Lucro Líq.", value: Math.abs(net), displayValue: net, color: net >= 0 ? "#6366f1" : "#ef4444", isNegative: net < 0 },
  ].filter((d) => d.value > 0);
}

function makeLabel(data: WaterfallEntry[]) {
  return function CustomLabel(props: unknown) {
    const { x, y, width, index } = props as {
      x: number;
      y: number;
      width: number;
      index: number;
    };
    const entry = data?.[index];
    if (!entry) return null;
    const prefix = entry.isNegative ? "−" : "";
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        textAnchor="middle"
        fill={entry.color}
        fontSize={10}
        fontFamily="monospace"
        fontWeight={700}
      >
        {prefix} {fmtBRLDecimal(entry.value)}
      </text>
    );
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: WaterfallEntry }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const e = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1 font-medium">{e.name}</p>
      <p className="font-bold font-mono text-sm" style={{ color: e.color }}>
        {e.isNegative ? "−" : ""} {fmtBRLDecimal(e.value)}
      </p>
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
        <Skeleton className="h-64 w-full bg-zinc-800 rounded-lg" />
      </div>
    );
  }

  if (!pl) return null;

  const data = buildData(pl);
  const CustomLabel = makeLabel(data);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100 mb-1">Composição do Resultado</h3>
      <p className="text-xs text-zinc-500 mb-5">
        Receita → Descontos → Custos Variáveis → Lucro Operacional → Custos Fixos → Lucro Líquido
      </p>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barSize={52} margin={{ top: 28, right: 8, left: 8, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717a", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#52525b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => fmtBRLDecimal(v)}
            width={64}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="value" radius={[5, 5, 0, 0]} isAnimationActive={false}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                fillOpacity={0.85}
              />
            ))}
            <LabelList content={CustomLabel} dataKey="value" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.color }} />
            <span className="text-[10px] text-zinc-500">{entry.name}</span>
            <span className="text-[10px] font-mono font-semibold" style={{ color: entry.color }}>
              {entry.isNegative ? "−" : ""} {fmtBRLDecimal(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
