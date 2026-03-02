"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { fmtInt, fmtBRL } from "@/utils/format";

interface BreakdownRow {
  name: string;
  payments: number;
  revenue: number;
  percentage: string;
}

interface FinanceBreakdownTableProps {
  title: string;
  subtitle: string;
  rows: BreakdownRow[];
  isLoading: boolean;
}

export function FinanceBreakdownTable({
  title,
  subtitle,
  rows,
  isLoading,
}: FinanceBreakdownTableProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
      <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg bg-zinc-800" />
          ))
        ) : rows.length === 0 ? (
          <p className="text-center py-8 text-zinc-600 text-sm">
            Sem dados no período
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.name}
              className="flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-200 capitalize truncate">
                  {row.name}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {fmtInt(row.payments)} pagamentos
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold font-mono text-emerald-400">
                  {fmtBRL(row.revenue / 100)}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{row.percentage}</p>
              </div>
              <div className="w-16 hidden sm:block">
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500/60"
                    style={{ width: row.percentage }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
