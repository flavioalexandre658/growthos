"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardPeriod, IDateFilter } from "@/interfaces/dashboard.interface";
import { cn } from "@/lib/utils";
import { IconCalendar, IconX, IconRefresh } from "@tabler/icons-react";

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "3d", label: "3d" },
  { value: "7d", label: "7d" },
  { value: "this_month", label: "Mês" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

interface PeriodFilterProps {
  filter: IDateFilter;
}

export function PeriodFilter({ filter }: PeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasRange = !!(filter.start_date && filter.end_date);
  const [showCustom, setShowCustom] = useState(hasRange);
  const [localStart, setLocalStart] = useState(filter.start_date ?? "");
  const [localEnd, setLocalEnd] = useState(filter.end_date ?? "");

  const push = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val) params.set(key, val);
        else params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const handlePeriod = (p: DashboardPeriod) => {
    setShowCustom(false);
    setLocalStart("");
    setLocalEnd("");
    push({ period: p, start_date: undefined, end_date: undefined });
  };

  const handleDateApply = (start: string, end: string) => {
    if (!start || !end) return;
    push({ start_date: start, end_date: end, period: undefined });
  };

  const handleClearCustom = () => {
    setLocalStart("");
    setLocalEnd("");
    setShowCustom(false);
    push({ period: "today", start_date: undefined, end_date: undefined });
  };

  const activePeriod = !hasRange ? (filter.period ?? "today") : null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    setIsRefreshing(false);
  };

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Atualizar dados"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors disabled:opacity-50 shrink-0"
        >
          <IconRefresh size={14} className={isRefreshing ? "animate-spin" : ""} />
        </button>
        <div className="overflow-x-auto -mx-1 px-1 scrollbar-none">
          <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/80 p-1 w-max">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePeriod(opt.value)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
                  activePeriod === opt.value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100"
                )}
              >
                {opt.label}
              </button>
            ))}
            <div className="mx-1 h-4 w-px bg-zinc-700" />
            <button
              onClick={() => setShowCustom((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
                hasRange
                  ? "bg-indigo-600 text-white shadow-sm"
                  : showCustom
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
              title="Intervalo personalizado"
            >
              <IconCalendar size={12} />
              {hasRange ? "Custom" : "Datas"}
            </button>
          </div>
        </div>
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="date"
            value={localStart}
            max={localEnd || undefined}
            onChange={(e) => {
              setLocalStart(e.target.value);
              if (localEnd && e.target.value) handleDateApply(e.target.value, localEnd);
            }}
            className="h-8 flex-1 min-w-[130px] rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-[16px] sm:text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 [color-scheme:dark]"
          />
          <span className="text-xs text-zinc-600">→</span>
          <input
            type="date"
            value={localEnd}
            min={localStart || undefined}
            onChange={(e) => {
              setLocalEnd(e.target.value);
              if (localStart && e.target.value) handleDateApply(localStart, e.target.value);
            }}
            className="h-8 flex-1 min-w-[130px] rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-[16px] sm:text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 [color-scheme:dark]"
          />
          {hasRange && (
            <button
              onClick={handleClearCustom}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-red-800 hover:text-red-400 transition-colors shrink-0"
              title="Limpar intervalo"
            >
              <IconX size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
