"use client";

import { IconBuilding } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { IBillingData } from "@/actions/billing/get-billing.action";
import { formatEventsLimit } from "@/utils/plans";

interface BillingUsageMeterProps {
  billing: IBillingData;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function BillingUsageMeter({ billing }: BillingUsageMeterProps) {
  const { usage } = billing;
  const percentage = usage.percentage;

  const barColor =
    percentage >= 90
      ? "bg-red-500"
      : percentage >= 70
        ? "bg-amber-500"
        : "bg-indigo-500";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Uso este mês</p>
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-bold text-zinc-100">
            {formatCount(usage.total)}{" "}
            <span className="text-sm font-normal text-zinc-500">
              / {formatEventsLimit(usage.limit)} eventos
            </span>
          </p>
          <span
            className={cn(
              "text-sm font-semibold",
              percentage >= 90 ? "text-red-400" : percentage >= 70 ? "text-amber-400" : "text-zinc-400",
            )}
          >
            {percentage}%
          </span>
        </div>
      </div>

      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {usage.byOrg.length > 0 && (
        <div className="space-y-2 pt-1">
          {usage.byOrg
            .sort((a, b) => b.eventsCount - a.eventsCount)
            .map((org, i) => {
              const orgPct = Math.round((org.eventsCount / usage.limit) * 100);
              const isLast = i === usage.byOrg.length - 1;
              return (
                <div key={org.organizationId} className="flex items-center gap-3">
                  <span className="text-zinc-600 text-xs w-3 shrink-0">
                    {isLast ? "└" : "├"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <IconBuilding size={11} className="text-zinc-600 shrink-0" />
                        <span className="text-xs text-zinc-400 truncate">{org.organizationName}</span>
                      </div>
                      <span className="text-xs text-zinc-500 shrink-0">
                        {formatCount(org.eventsCount)}
                      </span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-zinc-800 mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-600"
                        style={{ width: `${Math.min(100, orgPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {percentage >= 80 && (
        <p className="text-xs text-amber-400/80 border border-amber-500/20 rounded-lg px-3 py-2 bg-amber-500/5">
          {percentage >= 90
            ? "⚠️ Você está quase no limite! Faça upgrade para evitar a interrupção do rastreamento."
            : "📊 Você usou mais de 80% da sua cota. Considere fazer upgrade em breve."}
        </p>
      )}
    </div>
  );
}
