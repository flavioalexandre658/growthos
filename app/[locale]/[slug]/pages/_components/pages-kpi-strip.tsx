"use client";

import { useTranslations } from "next-intl";
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
  rightBorder?: boolean;
  bottomBorder?: boolean;
}

function KpiItem({ label, value, sub, rightBorder, bottomBorder }: KpiItemProps) {
  return (
    <div
      className={[
        "flex flex-col gap-0.5 px-4 py-3 min-w-0",
        rightBorder ? "border-r border-zinc-800" : "",
        bottomBorder ? "border-b border-zinc-800" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider truncate">
        {label}
      </span>
      <div className="text-sm font-bold font-mono text-zinc-100 truncate">{value}</div>
      {sub && <div className="text-[10px] text-zinc-600 truncate">{sub}</div>}
    </div>
  );
}

export function PagesKpiStrip({ data, isLoading }: PagesKpiStripProps) {
  const t = useTranslations("pages.kpiStrip");

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 grid grid-cols-2 sm:flex overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 px-4 py-3 border-r border-zinc-800 last:border-r-0 border-b sm:border-b-0"
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
    return p.length > 18 ? p.slice(0, 17) + "…" : p;
  };

  return (
    <>
      <div className="sm:hidden rounded-xl border border-zinc-800 bg-zinc-900/50 grid grid-cols-2 overflow-hidden">
        <KpiItem
          label={t("totalPages")}
          value={fmtInt(totalPages)}
          sub={t("withRevenue", { count: fmtInt(pagesWithRevenue) })}
          rightBorder
          bottomBorder
        />
        <KpiItem
          label={t("totalRevenue")}
          value={<span className="text-emerald-400">{fmtBRLDecimal(totalRevenue / 100)}</span>}
          sub={t("inPeriod")}
          bottomBorder
        />
        <KpiItem
          label={t("bestConversionShort")}
          value={
            bestConversionPage ? (
              <span className="text-indigo-400 font-mono text-xs">{shortPath(bestConversionPage)}</span>
            ) : "—"
          }
          sub={bestConversionPage ? t("conversionRateShort", { rate: bestConversionRate }) : undefined}
          rightBorder
        />
        <KpiItem
          label={t("biggestOpportunityShort")}
          value={
            biggestOpportunityPage ? (
              <span className="text-amber-400 font-mono text-xs">{shortPath(biggestOpportunityPage)}</span>
            ) : "—"
          }
          sub={biggestOpportunityPage ? t("visitsShort", { count: fmtInt(biggestOpportunityVisits) }) : undefined}
        />
      </div>

      <div className="hidden sm:flex rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <KpiItem
          label={t("totalPages")}
          value={fmtInt(totalPages)}
          sub={t("withRevenue", { count: fmtInt(pagesWithRevenue) })}
          rightBorder
        />
        <KpiItem
          label={t("totalRevenue")}
          value={<span className="text-emerald-400">{fmtBRLDecimal(totalRevenue / 100)}</span>}
          sub={t("inPeriod")}
          rightBorder
        />
        <KpiItem
          label={t("bestConversion")}
          value={
            bestConversionPage ? (
              <span className="text-indigo-400 font-mono text-xs">
                {bestConversionPage.length > 28 ? bestConversionPage.slice(0, 27) + "…" : bestConversionPage}
              </span>
            ) : "—"
          }
          sub={bestConversionPage ? t("conversionRate", { rate: bestConversionRate }) : undefined}
          rightBorder
        />
        <KpiItem
          label={t("biggestOpportunity")}
          value={
            biggestOpportunityPage ? (
              <span className="text-amber-400 font-mono text-xs">
                {biggestOpportunityPage.length > 28 ? biggestOpportunityPage.slice(0, 27) + "…" : biggestOpportunityPage}
              </span>
            ) : "—"
          }
          sub={biggestOpportunityPage ? t("visitsLowConversion", { count: fmtInt(biggestOpportunityVisits) }) : undefined}
        />
      </div>
    </>
  );
}
