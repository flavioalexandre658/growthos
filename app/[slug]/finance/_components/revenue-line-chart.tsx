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
import type { IProfitAndLoss } from "@/interfaces/cost.interface";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal } from "@/utils/format";

interface RevenueLineChartProps {
  data: IDailyData[] | undefined;
  pl: IProfitAndLoss | null | undefined;
  isLoading: boolean;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function RevenueLineChart({ data, pl, isLoading }: RevenueLineChartProps) {
  const rows = data ?? [];

  const totalGross = rows.reduce((sum, d) => sum + (d.revenue ?? 0), 0);

  const totalEventCosts = pl?.eventCostsInCents ?? 0;
  const totalVariableCosts = pl?.totalVariableCostsInCents ?? 0;
  const totalFixedCosts = pl?.totalFixedCostsInCents ?? 0;

  const chartData = rows.map((d) => {
    const gross = (d.revenue ?? 0) / 100;
    const share = totalGross > 0 ? (d.revenue ?? 0) / totalGross : 0;
    const eventCostDay = (totalEventCosts * share) / 100;
    const variableCostDay = (totalVariableCosts * share) / 100;
    const fixedCostDay = (totalFixedCosts * share) / 100;
    const operatingProfit = gross - eventCostDay - variableCostDay;
    const netProfit = operatingProfit - fixedCostDay;

    return {
      label: formatDateLabel(d.date),
      gross,
      operating_profit: operatingProfit,
      net_profit: netProfit,
    };
  });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">
        Evolução Diária do Resultado
      </h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        Receita bruta, lucro operacional e lucro líquido no período selecionado
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
                tickFormatter={(v) => fmtBRLDecimal(v)}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#e4e4e7",
                }}
                formatter={(v: number) => [fmtBRLDecimal(v)]}
                cursor={{ stroke: "#3f3f46" }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  color: "#71717a",
                  paddingTop: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="gross"
                name="Receita Bruta"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#22c55e" }}
              />
              <Line
                type="monotone"
                dataKey="operating_profit"
                name="Lucro Operacional"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#06b6d4" }}
              />
              <Line
                type="monotone"
                dataKey="net_profit"
                name="Lucro Líquido"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 5"
                activeDot={{ r: 4, fill: "#a855f7" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
