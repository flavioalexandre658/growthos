"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardPeriod, IDateFilter } from "@/interfaces/dashboard.interface";
import { cn } from "@/lib/utils";
import { IconCalendar, IconX, IconRefresh, IconChevronDown, IconCheck } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslations } from "next-intl";

const MOBILE_QUICK: DashboardPeriod[] = ["today", "7d", "30d"];

interface PeriodFilterProps {
  filter: IDateFilter;
}

export function PeriodFilter({ filter }: PeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const t = useTranslations("dashboard.periodFilter");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
    { value: "today", label: t("today") },
    { value: "yesterday", label: t("yesterday") },
    { value: "3d", label: t("3d") },
    { value: "7d", label: t("7d") },
    { value: "this_month", label: t("thisMonth") },
    { value: "30d", label: t("30d") },
    { value: "90d", label: t("90d") },
  ];

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
    setMobileOpen(false);
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

  const activeLabel = hasRange
    ? `${filter.start_date} → ${filter.end_date}`
    : PERIOD_OPTIONS.find((o) => o.value === activePeriod)?.label ?? t("today");

  const isOtherActive = (activePeriod !== null && !MOBILE_QUICK.includes(activePeriod)) || hasRange;

  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      {/* ── Mobile layout (< sm) ────────────────────────────── */}
      <div className="flex items-center gap-2 sm:hidden">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          title={t("refreshData")}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors disabled:opacity-50 shrink-0"
        >
          <IconRefresh size={14} className={isRefreshing ? "animate-spin" : ""} />
        </button>

        <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/80 p-1 flex-1">
          {MOBILE_QUICK.map((val) => {
            const opt = PERIOD_OPTIONS.find((o) => o.value === val)!;
            return (
              <button
                key={val}
                onClick={() => handlePeriod(val)}
                className={cn(
                  "flex-1 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
                  activePeriod === val
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100"
                )}
              >
                {opt.label}
              </button>
            );
          })}

          <div className="mx-1 h-4 w-px bg-zinc-700 shrink-0" />

          <Popover open={mobileOpen} onOpenChange={setMobileOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
                  isOtherActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100"
                )}
              >
                {isOtherActive && !hasRange ? activeLabel : t("more")}
                <IconChevronDown size={10} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              className="w-56 p-2 bg-zinc-900 border-zinc-800"
            >
              <div className="space-y-0.5">
                {PERIOD_OPTIONS.filter((o) => !MOBILE_QUICK.includes(o.value)).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handlePeriod(opt.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                      activePeriod === opt.value
                        ? "bg-indigo-600/20 text-indigo-300"
                        : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                    )}
                  >
                    {opt.label}
                    {activePeriod === opt.value && <IconCheck size={12} />}
                  </button>
                ))}

                <div className="my-1.5 h-px bg-zinc-800" />

                <button
                  onClick={() => setShowCustom((v) => !v)}
                  className={cn(
                    "w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    hasRange
                      ? "bg-indigo-600/20 text-indigo-300"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  )}
                >
                  <IconCalendar size={12} />
                  {hasRange ? t("customActive") : t("customRange")}
                  {hasRange && <IconCheck size={12} className="ml-auto" />}
                </button>

                {showCustom && (
                  <div className="pt-1.5 flex flex-col gap-1.5">
                    <input
                      type="date"
                      value={localStart}
                      max={localEnd || undefined}
                      onChange={(e) => {
                        setLocalStart(e.target.value);
                        if (localEnd && e.target.value) handleDateApply(e.target.value, localEnd);
                      }}
                      className="h-8 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 text-[16px] text-zinc-200 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                    />
                    <input
                      type="date"
                      value={localEnd}
                      min={localStart || undefined}
                      onChange={(e) => {
                        setLocalEnd(e.target.value);
                        if (localStart && e.target.value) handleDateApply(localStart, e.target.value);
                      }}
                      className="h-8 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 text-[16px] text-zinc-200 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                    />
                    {hasRange && (
                      <button
                        onClick={handleClearCustom}
                        className="flex items-center justify-center gap-1.5 h-7 rounded-md border border-zinc-700 text-xs text-zinc-500 hover:border-red-800 hover:text-red-400 transition-colors"
                      >
                        <IconX size={11} />
                        {t("clear")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Desktop layout (sm+) ─────────────────────────────── */}
      <div className="hidden sm:flex items-center gap-2">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          title={t("refreshData")}
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
                  ? "bg-indigo-600 text-white"
                  : showCustom
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-100"
              )}
              title={t("customRange")}
            >
              <IconCalendar size={12} />
              {hasRange ? t("customDesktop") : t("dates")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Custom date range row (desktop only) ─────────────── */}
      {showCustom && (
        <div className="hidden sm:flex flex-wrap items-center gap-1.5">
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
              title={t("clearRange")}
            >
              <IconX size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
