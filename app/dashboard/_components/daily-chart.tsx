"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { IDailyData } from "@/interfaces/dashboard.interface";
import { Skeleton } from "@/components/ui/skeleton";

interface DailyChartProps {
  data: IDailyData[] | undefined;
  isLoading: boolean;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function DailyChart({ data, isLoading }: DailyChartProps) {
  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
  }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">Evolução Diária</h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        Cadastros, edições e pagamentos por dia
      </p>

      <div className="mt-5">
        {isLoading ? (
          <Skeleton className="h-52 w-full rounded-lg bg-zinc-800" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
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
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#e4e4e7",
                }}
                labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
                cursor={{ fill: "#ffffff08" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#71717a", paddingTop: 12 }}
              />
              <Bar
                dataKey="signups"
                name="Cadastros"
                fill="#6366f1"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="edits"
                name="Edições"
                fill="#8b5cf6"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="payments"
                name="Pagamentos"
                fill="#22c55e"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
