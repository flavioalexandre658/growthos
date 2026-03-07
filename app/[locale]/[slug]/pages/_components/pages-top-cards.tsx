"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal, fmtInt } from "@/utils/format";
import type { ILandingPageData, IStepMeta } from "@/interfaces/dashboard.interface";

interface PagesTopCardsProps {
  data: ILandingPageData[];
  stepMeta: IStepMeta[];
  isLoading: boolean;
}

function conversionColor(value: string) {
  const n = parseFloat(value);
  if (n >= 10) return "text-emerald-400";
  if (n >= 3) return "text-zinc-300";
  if (n >= 1) return "text-amber-400";
  return "text-red-400";
}

function shortPath(p: string, max = 30): string {
  if (p.length <= max) return p;
  const parts = p.split("/").filter(Boolean);
  if (parts.length <= 1) return p.slice(0, max - 1) + "…";
  return "/" + parts[parts.length - 1].slice(0, max - 4) + (parts[parts.length - 1].length > max - 4 ? "…" : "");
}

export function PagesTopCards({ data, stepMeta, isLoading }: PagesTopCardsProps) {
  const t = useTranslations("pages.topCards");
  const topPages = data.filter((p) => p.revenue > 0).slice(0, 5);

  const firstStepKey = stepMeta[0]?.key ?? "pageview";

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2"
          >
            <Skeleton className="h-3 w-20 bg-zinc-800 rounded" />
            <Skeleton className="h-6 w-24 bg-zinc-800 rounded" />
            <Skeleton className="h-3 w-16 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (topPages.length === 0) return null;

  const maxRevenue = topPages[0]?.revenue ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {topPages.map((page, idx) => {
        const visits = page.steps[firstStepKey] ?? page.steps["pageview"] ?? 0;
        const barWidth = maxRevenue > 0 ? (page.revenue / maxRevenue) * 100 : 0;
        const rank = idx + 1;

        return (
          <div
            key={page.page}
            className="group relative rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/60 p-4 transition-colors overflow-hidden"
            title={page.page}
          >
            <div
              className="absolute bottom-0 left-0 h-0.5 rounded-full transition-all"
              style={{
                width: `${barWidth}%`,
                background:
                  rank === 1
                    ? "rgba(52,211,153,0.6)"
                    : rank === 2
                      ? "rgba(52,211,153,0.4)"
                      : "rgba(52,211,153,0.2)",
              }}
            />

            <div className="flex items-start justify-between mb-2">
              <span
                className="text-[10px] font-mono font-semibold text-zinc-500"
              >
                #{rank}
              </span>
              <span
                className={`text-[10px] font-mono font-semibold ${conversionColor(page.conversion_rate)}`}
              >
                {page.conversion_rate}
              </span>
            </div>

            <div className="font-mono text-[10px] text-zinc-400 truncate mb-2" title={page.page}>
              {shortPath(page.page)}
            </div>

            <div className="text-sm font-bold font-mono text-emerald-400">
              {fmtBRLDecimal(page.revenue / 100)}
            </div>

            {visits > 0 && (
              <div className="mt-1 text-[10px] text-zinc-600 font-mono">
                {t("visitsShort", { count: fmtInt(visits) })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
