"use client";

import { useTranslations } from "next-intl";
import {
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
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
  const [, month, day] = dateStr.split("-");
  return `${parseInt(day)}/${parseInt(month)}`;
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/95 px-3.5 py-3 text-xs shadow-2xl min-w-[160px]">
      <p className="text-zinc-500 font-medium mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: item.color }} />
              <span className="text-zinc-400">{item.name}</span>
            </div>
            <span className="font-bold font-mono tabular-nums" style={{ color: item.color }}>
              {fmtBRLDecimal(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SERIES_CONFIG = [
  { key: "gross", tKey: "grossRevenue", color: "#22c55e" },
  { key: "operating_profit", tKey: "operatingProfit", color: "#06b6d4" },
  { key: "net_profit", tKey: "netProfit", color: "#a855f7" },
];

export function RevenueLineChart({ data, pl, isLoading }: RevenueLineChartProps) {
  const t = useTranslations("finance.revenueChart");
  const rows = data ?? [];

  const series = SERIES_CONFIG.map((s) => ({ ...s, label: t(s.tKey) }));

  const totalGross = rows.reduce((sum, d) => sum + (d.revenue ?? 0), 0);

  const totalEventCosts = pl?.eventCostsInCents ?? 0;
  const totalVariableCosts = pl?.totalVariableCostsInCents ?? 0;
  const totalFixedCosts = pl?.totalFixedCostsInCents ?? 0;
  const totalMarketingCosts = pl?.marketingSpendInCents ?? 0;

  const chartData = rows.map((d) => {
    const gross = (d.revenue ?? 0) / 100;
    const share = totalGross > 0 ? (d.revenue ?? 0) / totalGross : 0;
    const eventCostDay = (totalEventCosts * share) / 100;
    const variableCostDay = (totalVariableCosts * share) / 100;
    const fixedCostDay = (totalFixedCosts * share) / 100;
    const marketingCostDay = (totalMarketingCosts * share) / 100;
    const operatingProfit = gross - eventCostDay - variableCostDay;
    const netProfit = operatingProfit - fixedCostDay - marketingCostDay;

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
        {t("title")}
      </h3>
      <p className="mt-0.5 text-xs text-zinc-500 mb-5">
        {t("subtitle")}
      </p>

      <div className="flex items-center gap-4 flex-wrap mb-4">
        {series.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            <span className="text-[11px] text-zinc-500">{label}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-52 w-full rounded-lg bg-zinc-800" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-gross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#3f3f46", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="gross"
              name={series[0].label}
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#grad-gross)"
              dot={false}
              activeDot={{ r: 4, fill: "#22c55e", stroke: "#18181b", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="operating_profit"
              name={series[1].label}
              stroke="#06b6d4"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, fill: "#06b6d4", stroke: "#18181b", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="net_profit"
              name={series[2].label}
              stroke="#a855f7"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="5 4"
              activeDot={{ r: 4, fill: "#a855f7", stroke: "#18181b", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
