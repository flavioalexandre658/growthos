import { IconTrendingUp, IconMinus } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import type { IPublicMetrics, IPublicOrgData, IPublicMrrEntry } from "@/interfaces/public-page.interface";

interface PublicHeroMrrProps {
  metrics: IPublicMetrics;
  org: IPublicOrgData;
  mrrHistory: IPublicMrrEntry[] | null;
}

function formatExact(value: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function getJourneyHeadline(
  currentMrr: number,
  mrrHistory: IPublicMrrEntry[] | null,
  org: IPublicOrgData,
): string | null {
  if (!mrrHistory || mrrHistory.length < 2) return null;

  const firstEntry = mrrHistory[0];
  const startDate = dayjs(firstEntry.date);
  const now = dayjs();
  const months = now.diff(startDate, "month");
  if (months < 1) return null;

  const unit = months === 1 ? "mês" : "meses";
  const startValue = formatExact(firstEntry.mrr, org.locale, org.currency);
  const current = formatExact(currentMrr, org.locale, org.currency);

  if (firstEntry.mrr === 0) {
    return `De R$ 0 a ${current} em ${months} ${unit}`;
  }

  return `De ${startValue} a ${current} em ${months} ${unit}`;
}

export function PublicHeroMrr({ metrics, org, mrrHistory }: PublicHeroMrrProps) {
  if (!metrics.mrr) return null;

  const mrrRaw = typeof metrics.mrr.value === "number" ? metrics.mrr.value : null;
  const mrrStr = mrrRaw !== null
    ? formatExact(mrrRaw, org.locale, org.currency)
    : String(metrics.mrr.value);

  const growth = metrics.mrrGrowthRate;
  const hasGrowth = growth !== null && growth !== undefined;
  const isPositive = hasGrowth && growth! > 0;
  const isNeutral = hasGrowth && Math.abs(growth!) < 0.5;

  const journey = mrrRaw !== null ? getJourneyHeadline(mrrRaw, mrrHistory, org) : null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
        MRR
      </p>

      <div className="flex items-end gap-3 flex-wrap">
        <span className="text-[64px] sm:text-[80px] font-black font-mono leading-none tracking-tight text-indigo-400 tabular-nums">
          {mrrStr}
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
