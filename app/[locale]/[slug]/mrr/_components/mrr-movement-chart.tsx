"use client";

import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtCurrencyDecimal } from "@/utils/format";
import { useOrganization } from "@/components/providers/organization-provider";
import type { IMrrMovementEntry } from "@/interfaces/mrr.interface";

interface MrrMovementChartProps {
  data: IMrrMovementEntry[] | undefined;
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

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  locale,
  currency,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  locale: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  const netMrr = payload.find((p) => p.dataKey === "netMrr");
  const others = payload.filter((p) => p.dataKey !== "netMrr" && Math.abs(p.value) > 0);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs space-y-1 min-w-[180px]">
      <p className="text-zinc-400 font-medium mb-1.5">{label}</p>
      {others.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono font-bold text-zinc-100">
            {fmtCurrencyDecimal(Math.abs(p.value) / 100, locale, currency)}
          </span>
        </div>
      ))}
      {netMrr && (
        <>
          <div className="border-t border-zinc-800 my-1" />
          <div className="flex items-center justify-between gap-4">
            <span style={{ color: netMrr.color }} className="font-semibold">{netMrr.name}</span>
            <span className="font-mono font-bold" style={{ color: netMrr.color }}>
              {netMrr.value >= 0 ? "+" : ""}{fmtCurrencyDecimal(netMrr.value / 100, locale, currency)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export function MrrMovementChart({ data, isLoading }: MrrMovementChartProps) {
  const t = useTranslations("mrr.movementChart");
  const { organization } = useOrganization();
  const locale = organization?.locale ?? "pt-BR";
  const currency = organization?.currency ?? "BRL";
  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
    churnedMrr: -Math.abs(d.churnedMrr),
    contractionMrr: -Math.abs(d.contractionMrr),
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
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barSize={20} barCategoryGap="30%">
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
              tickFormatter={(v) => fmtCurrencyDecimal(Math.abs(v) / 100, locale, currency)}
              width={64}
            />
            <Tooltip content={<CustomTooltip locale={locale} currency={currency} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#71717a", paddingTop: 14 }}
              formatter={(value) => <span style={{ color: "#71717a" }}>{value}</span>}
            />
            <ReferenceLine y={0} stroke="#3f3f46" strokeWidth={1.5} />

            <Bar dataKey="newMrr" name={t("legendNewMrr")} fill="#22c55e" fillOpacity={0.9} stackId="positive" radius={[3, 3, 0, 0]} />
            <Bar dataKey="renewalMrr" name={t("legendRenewals")} fill="#84cc16" fillOpacity={0.85} stackId="positive" />
            <Bar dataKey="expansionMrr" name={t("legendUpgrade")} fill="#06b6d4" fillOpacity={0.85} stackId="positive" />
            <Bar dataKey="churnedMrr" name={t("legendChurn")} fill="#ef4444" fillOpacity={0.85} stackId="negative" radius={[0, 0, 3, 3]} />
            <Bar dataKey="contractionMrr" name={t("legendDowngrade")} fill="#f97316" fillOpacity={0.85} stackId="negative" />
            <Bar dataKey="netMrr" name={t("legendNetMrr")} fill="#6366f1" fillOpacity={0} stackId="net" radius={[3, 3, 3, 3]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
