"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal, fmtInt } from "@/utils/format";
import type { ILandingPagesResult } from "@/interfaces/dashboard.interface";

interface PagesKpiStripProps {
  data: ILandingPagesResult | undefined;
  isLoading: boolean;
}

interface KpiItemProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  divider?: boolean;
}

function KpiItem({ label, value, sub, divider = true }: KpiItemProps) {
  return (
    <div
      className={`flex-1 min-w-0 px-5 py-3 flex flex-col gap-0.5 ${divider ? "border-r border-zinc-800" : ""}`}
    >
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
        {label}
      </span>
      <div className="text-sm font-bold font-mono text-zinc-100 truncate">{value}</div>
      {sub && <div className="text-[10px] text-zinc-600 truncate">{sub}</div>}
    </div>
  );
}

export function PagesKpiStrip({ data, isLoading }: PagesKpiStripProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 flex overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 px-5 py-3 border-r border-zinc-800 last:border-r-0"
          >
            <Skeleton className="h-3 w-16 bg-zinc-800 mb-2 rounded" />
            <Skeleton className="h-5 w-24 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const totalPages = data?.totalPages ?? 0;
  const pagesWithRevenue = data?.pagesWithRevenue ?? 0;
  const totalRevenue = data?.totalRevenue ?? 0;
  const bestConversionPage = data?.bestConversionPage ?? "";
  const bestConversionRate = data?.bestConversionRate ?? "0%";
  const biggestOpportunityPage = data?.biggestOpportunityPage ?? "";
  const biggestOpportunityVisits = data?.biggestOpportunityVisits ?? 0;

  const shortPath = (p: string) => {
    if (!p) return "—";
    return p.length > 28 ? p.slice(0, 27) + "…" : p;
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 flex overflow-hidden">
      <KpiItem
        label="Total de Páginas"
        value={fmtInt(totalPages)}
        sub={`${fmtInt(pagesWithRevenue)} com receita`}
      />
      <KpiItem
        label="Receita Total"
        value={
          <span className="text-emerald-400">
            {fmtBRLDecimal(totalRevenue / 100)}
          </span>
        }
        sub="no período"
      />
      <KpiItem
        label="Melhor Conversão"
        value={
          bestConversionPage ? (
            <span className="text-indigo-400 font-mono text-xs">
              {shortPath(bestConversionPage)}
            </span>
          ) : (
            "—"
          )
        }
        sub={bestConversionPage ? `${bestConversionRate} de conversão` : undefined}
      />
      <KpiItem
        label="Maior Oportunidade"
        value={
          biggestOpportunityPage ? (
            <span className="text-amber-400 font-mono text-xs">
              {shortPath(biggestOpportunityPage)}
            </span>
          ) : (
            "—"
          )
        }
        sub={
          biggestOpportunityPage
            ? `${fmtInt(biggestOpportunityVisits)} visitas, conv. < 1%`
            : undefined
        }
        divider={false}
      />
    </div>
  );
}
