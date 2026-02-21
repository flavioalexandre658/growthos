"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { IDailyData } from "@/interfaces/dashboard.interface";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueLineChartProps {
  data: IDailyData[] | undefined;
  isLoading: boolean;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function RevenueLineChart({ data, isLoading }: RevenueLineChartProps) {
  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
    revenue: parseFloat(String(d.revenue ?? 0)),
    net_revenue: parseFloat(String(d.net_revenue ?? 0)),
  }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">
        Receita Diária — Bruta vs Líquida
      </h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        Evolução da receita no período selecionado
      </p>

      <div className="mt-5">
        {isLoading ? (
          <Skeleton className="h-52 w-full rounded-lg bg-zinc-800" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
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
                tickFormatter={(v) => `R$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#e4e4e7",
                }}
                formatter={(v: number) => `R$ ${v.toFixed(2)}`}
                cursor={{ stroke: "#3f3f46" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#71717a", paddingTop: 12 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Bruta"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#22c55e" }}
              />
              <Line
                type="monotone"
                dataKey="net_revenue"
                name="Líquida"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                activeDot={{ r: 4, fill: "#06b6d4" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
