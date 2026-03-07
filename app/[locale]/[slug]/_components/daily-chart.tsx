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
import type { IDailyData, IStepMeta } from "@/interfaces/dashboard.interface";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtInt } from "@/utils/format";
import { getStepColor } from "@/utils/step-colors";
import { useTranslations } from "next-intl";

interface DailyChartProps {
  data: IDailyData[] | undefined;
  stepMeta: IStepMeta[];
  isLoading: boolean;
  hiddenKeys?: Set<string>;
}

function formatDateLabel(dateStr: string) {
  const [, month, day] = dateStr.split("-");
  return `${parseInt(day)}/${parseInt(month)}`;
}

export function DailyChart({ data, stepMeta, isLoading, hiddenKeys }: DailyChartProps) {
  const t = useTranslations("dashboard.daily");
  const allStepKeys = stepMeta
    .filter((s) => s.key !== "pageview")
    .map((s) => s.key);

  const visibleStepMeta = stepMeta.filter(
    (s) => s.key !== "pageview" && !hiddenKeys?.has(s.key)
  );

  const chartData = (data ?? []).map((d) => ({
    label: formatDateLabel(d.date),
    ...d.steps,
  }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
      <p className="mt-0.5 text-xs text-zinc-500">{t("subtitle")}</p>

      <div className="mt-5">
        {isLoading ? (
          <Skeleton className="h-52 w-full rounded-lg bg-zinc-800" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2} barCategoryGap="25%">
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
                tick={{ fontSize: 10, fill: "#52525b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmtInt(v)}
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
                formatter={(v: number, name: string) => [fmtInt(v), name]}
                cursor={{ fill: "#ffffff08" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#71717a", paddingTop: 12 }}
              />
              {visibleStepMeta.map((step) => (
                <Bar
                  key={step.key}
                  dataKey={step.key}
                  name={step.label}
                  fill={getStepColor(step.key, allStepKeys).hex}
                  radius={[3, 3, 0, 0]}
                  opacity={0.85}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
