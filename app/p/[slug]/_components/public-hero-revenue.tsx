import { IconTrendingUp, IconMinus } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import type {
  IPublicMetrics,
  IPublicOrgData,
  IPublicRevenueEntry,
  BusinessMode,
} from "@/interfaces/public-page.interface";

interface PublicHeroRevenueProps {
  metrics: IPublicMetrics;
  org: IPublicOrgData;
  revenueHistory: IPublicRevenueEntry[] | null;
  businessMode: BusinessMode;
}

function formatExact(value: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function getJourneyHeadline(
  currentRevenue: number,
  history: IPublicRevenueEntry[] | null,
  org: IPublicOrgData,
): string | null {
  if (!history || history.length < 2) return null;

  const firstEntry = history[0];
  const startDate = dayjs(firstEntry.date);
  const now = dayjs();
  const months = now.diff(startDate, "month");
  if (months < 1) return null;

  const unit = months === 1 ? "mês" : "meses";
  const startValue = formatExact(firstEntry.revenue, org.locale, org.currency);
  const current = formatExact(currentRevenue, org.locale, org.currency);

  if (firstEntry.revenue === 0) {
    return `De R$ 0 a ${current} em ${months} ${unit}`;
  }

  return `De ${startValue} a ${current} em ${months} ${unit}`;
}

export function PublicHeroRevenue({
  metrics,
  org,
  revenueHistory,
  businessMode,
}: PublicHeroRevenueProps) {
  const revenueMetric = businessMode === "hybrid"
    ? metrics.monthlyRevenue
    : metrics.monthlyRevenue;

  if (!revenueMetric) return null;

  const revenueRaw = typeof revenueMetric.value === "number" ? revenueMetric.value : null;

  let displayValue: string;
  if (businessMode === "hybrid" && revenueRaw !== null && metrics.mrr) {
    const mrrRaw = typeof metrics.mrr.value === "number" ? metrics.mrr.value : 0;
    const totalRevenue = revenueRaw + mrrRaw;
    displayValue = formatExact(totalRevenue, org.locale, org.currency);
  } else {
    displayValue = revenueRaw !== null
      ? formatExact(revenueRaw, org.locale, org.currency)
      : String(revenueMetric.value);
  }

  const growth = metrics.revenueGrowthRate;
  const hasGrowth = growth !== null && growth !== undefined;
  const isPositive = hasGrowth && growth! > 0;
  const isNeutral = hasGrowth && Math.abs(growth!) < 0.5;

  const journey = revenueRaw !== null ? getJourneyHeadline(revenueRaw, revenueHistory, org) : null;

  const label = businessMode === "hybrid" ? "RECEITA TOTAL" : "RECEITA DO MÊS";

  return (
    <div className="space-y-2">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
        {label}
      </p>

      <div className="flex items-end gap-3 flex-wrap">
        <span className="text-[64px] sm:text-[80px] font-black font-mono leading-none tracking-tight text-indigo-400 tabular-nums">
          {displayValue}
        </span>

        {hasGrowth && (
          <span
            className={`flex items-center gap-1 text-sm font-bold font-mono mb-2 px-2.5 py-1 rounded-lg ${
              isNeutral
                ? "bg-zinc-800/60 text-zinc-500 border border-zinc-700/40"
                : isPositive
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/30"
                  : "bg-zinc-800/60 text-zinc-400 border border-zinc-700/40"
            }`}
          >
            {isPositive ? <IconTrendingUp size={14} /> : isNeutral ? <IconMinus size={14} /> : null}
            {isPositive ? "+" : ""}
            {growth!.toFixed(1)}%
          </span>
        )}
      </div>

      {journey && (
        <p className="text-[11px] sm:text-xs text-zinc-500 font-mono">
          {journey}
        </p>
      )}
    </div>
  );
}
