"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal } from "@/utils/format";
import type { IMrrMovementEntry } from "@/interfaces/mrr.interface";

interface MrrMovementChartProps {
  data: IMrrMovementEntry[] | undefined;
  isLoading: boolean;
}

function formatDateLabel(dateStr: string) {
  if (dateStr.length === 7) return dateStr.slice(5);
  const parts = dateStr.split("-");
  return `${parts[2]}/${parts[1]}`;
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs space-y-1 min-w-[160px]">
      <p className="text-zinc-400 font-medium mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono font-bold text-zinc-100">
            {fmtBRLDecimal(p.value / 100)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MrrMovementChart({ data, isLoading }: MrrMovementChartProps) {
  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
    churnedMrr: -d.churnedMrr,
    contractionMrr: -d.contractionMrr,
  }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">Movimentação do MRR</h3>
      <p className="mt-0.5 text-xs text-zinc-500 mb-4">
        Novo, Expansão, Contração e Churn por período
      </p>
      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-lg bg-zinc-800" />
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-56 text-zinc-600 text-sm">
          Sem dados de recorrência no período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#52525b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#52525b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmtBRLDecimal(Math.abs(v) / 100)}
              width={72}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#71717a", paddingTop: 12 }} />
            <ReferenceLine y={0} stroke="#3f3f46" />
            <Bar dataKey="newMrr" name="Novo MRR" fill="#22c55e" fillOpacity={0.8} stackId="positive" radius={[2, 2, 0, 0]} />
            <Bar dataKey="expansionMrr" name="Expansão" fill="#06b6d4" fillOpacity={0.8} stackId="positive" />
            <Bar dataKey="churnedMrr" name="Churn" fill="#ef4444" fillOpacity={0.8} stackId="negative" radius={[0, 0, 2, 2]} />
            <Bar dataKey="contractionMrr" name="Contração" fill="#f97316" fillOpacity={0.8} stackId="negative" />
            <Line
              type="monotone"
              dataKey="netMrr"
              name="MRR Líquido"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
