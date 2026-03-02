"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { IDailyData, IStepMeta } from "@/interfaces/dashboard.interface";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtInt, fmtBRL } from "@/utils/format";

const STEP_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#22c55e",
  "#06b6d4",
  "#f59e0b",
  "#f43f5e",
];

interface DailyChartProps {
  data: IDailyData[] | undefined;
  stepMeta: IStepMeta[];
  isLoading: boolean;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function DailyChart({ data, stepMeta, isLoading }: DailyChartProps) {
  const chartData = (data ?? []).map((d) => ({
    label: formatDateLabel(d.date),
    revenue: d.revenue,
    ...d.steps,
  }));

  const hasRevenue = (data ?? []).some((d) => d.revenue > 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">Evolução Diária</h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        Progresso do funil por dia
      </p>

      <div className="mt-5">
        {isLoading ? (
          <Skeleton className="h-52 w-full rounded-lg bg-zinc-800" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} barGap={2} barCategoryGap="25%">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#52525b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: "#52525b" }}
                axisLine={false}
                tickLine={false}
              />
              {hasRevenue && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "#52525b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtBRL(v)}
                />
              )}
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#e4e4e7",
                }}
                labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
                formatter={(v: number, name: string) => {
                  if (name === "Receita") return [fmtBRL(v), name];
                  return [fmtInt(v), name];
                }}
                cursor={{ fill: "#ffffff08" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#71717a", paddingTop: 12 }}
              />
              {stepMeta.map((step, idx) => (
                <Bar
                  key={step.key}
                  yAxisId="left"
                  dataKey={step.key}
                  name={step.label}
                  fill={STEP_COLORS[idx % STEP_COLORS.length]}
                  radius={[3, 3, 0, 0]}
                />
              ))}
              {hasRevenue && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  name="Receita"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
