"use client";

import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtCurrencyDecimal } from "@/utils/format";
import { useOrganization } from "@/components/providers/organization-provider";
import type { IMrrGrowthEntry } from "@/interfaces/mrr.interface";

interface MrrGrowthChartProps {
  data: IMrrGrowthEntry[] | undefined;
  isLoading: boolean;
}

function formatDateLabel(dateStr: string) {
  const parts = dateStr.split("-");
  if (parts.length === 2) {
    const [year, month] = parts;
    const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] ?? month}/${year.slice(2)}`;
  }
  return `${parts[2]}/${parts[1]}`;
}

function CustomTooltip({
  active,
  payload,
  label,
  locale,
  currency,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  locale: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="font-bold font-mono text-emerald-400">
        {fmtCurrencyDecimal(payload[0].value / 100, locale, currency)}
      </p>
    </div>
  );
}

export function MrrGrowthChart({ data, isLoading }: MrrGrowthChartProps) {
  const t = useTranslations("mrr.growthChart");
  const { organization } = useOrganization();
  const locale = organization?.locale ?? "pt-BR";
  const currency = organization?.currency ?? "BRL";
  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
  }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
      <p className="mt-0.5 text-xs text-zinc-500 mb-4">
        {t("subtitle")}
      </p>
      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-lg bg-zinc-800" />
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center h-56 text-zinc-600 text-sm">
          {t("emptyMessage")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(v) => fmtCurrencyDecimal(v / 100, locale, currency)}
              width={72}
            />
            <Tooltip content={<CustomTooltip locale={locale} currency={currency} />} cursor={{ stroke: "#3f3f46" }} />
            <Area
              type="monotone"
              dataKey="mrr"
              name="MRR"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#mrrGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#22c55e" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
