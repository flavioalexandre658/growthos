"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtCurrencyDecimal } from "@/utils/format";
import { useOrganization } from "@/components/providers/organization-provider";

interface BreakdownRow {
  name: string;
  payments: number;
  revenue: number;
  percentage: string;
  marginPercentage?: string;
}

interface FinanceBreakdownTableProps {
  title: string;
  subtitle: string;
  rows: BreakdownRow[];
  isLoading: boolean;
  showMargin?: boolean;
}

export function FinanceBreakdownTable({
  title,
  subtitle,
  rows,
  isLoading,
  showMargin = false,
}: FinanceBreakdownTableProps) {
  const t = useTranslations("finance.breakdownTable");
  const { organization } = useOrganization();
  const locale = organization?.locale ?? "pt-BR";
  const currency = organization?.currency ?? "BRL";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
      <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg bg-zinc-800" />
          ))
        ) : rows.length === 0 ? (
          <p className="text-center py-8 text-zinc-600 text-sm">
            {t("noDataForPeriod")}
          </p>
        ) : (
          rows.map((row) => {
            const marginVal = row.marginPercentage ? parseFloat(row.marginPercentage) : null;
            const marginPositive = marginVal !== null && marginVal >= 0;
            return (
              <div
                key={row.name}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2.5 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-200 capitalize truncate">
                    {row.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {t("payments", { count: row.payments })}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono text-emerald-400">
                    {fmtCurrencyDecimal(row.revenue / 100, locale, currency)}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{row.percentage}</p>
                </div>

                {showMargin && row.marginPercentage && (
                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold ${
                        marginPositive
                          ? "bg-emerald-950/50 text-emerald-400"
                          : "bg-rose-950/50 text-rose-400"
                      }`}
                    >
                      {marginPositive ? "+" : ""}{row.marginPercentage}
                    </span>
                    <p className="text-[9px] text-zinc-700 text-center mt-0.5">{t("margin")}</p>
                  </div>
                )}

                <div className="w-16 hidden sm:block">
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500/60"
                      style={{ width: row.percentage }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
