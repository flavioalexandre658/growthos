"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardPeriod, IDateFilter } from "@/interfaces/dashboard.interface";
import { cn } from "@/lib/utils";
import {
  IconCalendar,
  IconChevronDown,
  IconCheck,
  IconRefresh,
  IconX,
  IconArrowLeft,
} from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from "next-intl";
import dayjs from "@/utils/dayjs";
import type { DateRange } from "react-day-picker";
import { ptBR, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";

interface PeriodFilterProps {
  filter: IDateFilter;
}

type MobileView = "presets" | "calendar";

const PRESET_OPTIONS: DashboardPeriod[] = [
  "today",
  "yesterday",
  "7d",
  "14d",
  "30d",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "all_time",
];

const TRANSLATION_MAP: Record<DashboardPeriod, string> = {
  today: "today",
  yesterday: "yesterday",
  "3d": "3d",
  "7d": "7d",
  "14d": "14d",
  "30d": "30d",
  "90d": "90d",
  this_week: "thisWeek",
  last_week: "lastWeek",
  this_month: "thisMonth",
  last_month: "lastMonth",
  this_year: "thisYear",
  all_time: "allTime",
};

function formatRangeLabel(start: string, end: string): string {
  const s = dayjs(start);
  const e = dayjs(end);
  if (s.isSame(e, "day")) {
    return s.format("D [de] MMM.");
  }
  if (s.year() === e.year()) {
    return `${s.format("D MMM.")} – ${e.format("D MMM.")}`;
  }
  return `${s.format("D MMM. YYYY")} – ${e.format("D MMM. YYYY")}`;
}

export function PeriodFilter({ filter }: PeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const t = useTranslations("dashboard.periodFilter");
  const locale = useLocale();
  const calendarLocale = locale === "pt" ? ptBR : enUS;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("presets");

  const hasRange = !!(filter.start_date && filter.end_date);
  const activePeriod: DashboardPeriod | null = !hasRange
    ? (filter.period ?? "today")
    : null;

  const [draftPeriod, setDraftPeriod] = useState<DashboardPeriod | null>(activePeriod);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    hasRange
      ? {
          from: new Date(filter.start_date + "T00:00:00"),
          to: new Date(filter.end_date + "T00:00:00"),
        }
      : undefined
  );

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    setIsRefreshing(false);
  };

  const resetDraft = useCallback(() => {
    setDraftPeriod(activePeriod);
    setDraftRange(
      hasRange
        ? {
            from: new Date(filter.start_date + "T00:00:00"),
            to: new Date(filter.end_date + "T00:00:00"),
          }
        : undefined
    );
  }, [activePeriod, hasRange, filter.start_date, filter.end_date]);

  const applySelection = useCallback(() => {
    if (draftPeriod) {
      push({ period: draftPeriod, start_date: undefined, end_date: undefined });
    } else if (draftRange?.from && draftRange?.to) {
      const start = dayjs(draftRange.from).format("YYYY-MM-DD");
      const end = dayjs(draftRange.to).format("YYYY-MM-DD");
      push({ start_date: start, end_date: end, period: undefined });
    }
    setDesktopOpen(false);
    setMobileOpen(false);
  }, [draftPeriod, draftRange, push]);

  const handlePresetClick = (period: DashboardPeriod) => {
    setDraftPeriod(period);
    setDraftRange(undefined);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setDraftRange(range);
    if (range?.from) {
      setDraftPeriod(null);
    }
  };

  const handleMobilePresetApply = (period: DashboardPeriod) => {
    push({ period, start_date: undefined, end_date: undefined });
    setMobileOpen(false);
  };

  const handleMobileCustomOpen = () => {
    setDraftPeriod(null);
    setDraftRange(
      hasRange
        ? {
            from: new Date(filter.start_date + "T00:00:00"),
            to: new Date(filter.end_date + "T00:00:00"),
          }
        : { from: new Date(), to: new Date() }
    );
    setMobileView("calendar");
  };

  const handleMobileSave = () => {
    if (draftRange?.from && draftRange?.to) {
      const start = dayjs(draftRange.from).format("YYYY-MM-DD");
      const end = dayjs(draftRange.to).format("YYYY-MM-DD");
      push({ start_date: start, end_date: end, period: undefined });
    }
    setMobileOpen(false);
  };

  const activeLabel = useMemo(() => {
    if (hasRange) {
      return formatRangeLabel(filter.start_date!, filter.end_date!);
    }
    const key = TRANSLATION_MAP[activePeriod ?? "today"];
    return t(key);
  }, [hasRange, filter.start_date, filter.end_date, activePeriod, t]);

  const defaultMonth = useMemo(() => {
    if (draftRange?.from) return draftRange.from;
    return new Date();
  }, [draftRange]);

  const isCustomActive = draftPeriod === null;
  const canApply = draftPeriod !== null || (draftRange?.from && draftRange?.to);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        title={t("refreshData")}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors disabled:opacity-50 shrink-0"
      >
        <IconRefresh size={14} className={isRefreshing ? "animate-spin" : ""} />
      </button>

      {/* ── Desktop trigger + Popover ──────────────────────── */}
      <div className="hidden sm:block">
        <Popover
          open={desktopOpen}
          onOpenChange={(open) => {
            setDesktopOpen(open);
            if (open) resetDraft();
          }}
        >
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-semibold transition-all",
                desktopOpen
                  ? "border-indigo-500 bg-indigo-600/10 text-indigo-300"
                  : "border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600"
              )}
            >
              <IconCalendar size={14} />
              <span>{activeLabel}</span>
              <IconChevronDown
                size={12}
                className={cn(
                  "text-zinc-500 transition-transform",
                  desktopOpen && "rotate-180"
                )}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="bottom"
            className="w-auto p-0 bg-zinc-950 border-zinc-800 shadow-xl"
          >
            <div className="flex">
              {/* Sidebar presets */}
              <div className="w-44 border-r border-zinc-800">
                <ScrollArea className="h-[380px]">
                  <div className="p-2 space-y-0.5">
                    <button
                      onClick={handleMobileCustomOpen}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors text-left",
                        isCustomActive
                          ? "bg-indigo-600/15 text-indigo-300"
                          : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
                      )}
                    >
                      <IconCalendar size={13} />
                      {t("custom")}
                    </button>

                    <div className="my-1.5 h-px bg-zinc-800" />

                    {PRESET_OPTIONS.map((period) => {
                      const isActive = draftPeriod === period;
                      return (
                        <button
                          key={period}
                          onClick={() => handlePresetClick(period)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors text-left",
                            isActive
                              ? "bg-indigo-600/15 text-indigo-300"
                              : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
                          )}
                        >
                          {t(TRANSLATION_MAP[period])}
                          {isActive && <IconCheck size={13} />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Calendar panel */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <div className="flex-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1 block">
                      {t("startDate")}
                    </label>
                    <input
                      type="date"
                      value={
                        draftRange?.from
                          ? dayjs(draftRange.from).format("YYYY-MM-DD")
                          : ""
                      }
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const d = new Date(e.target.value + "T00:00:00");
                        setDraftRange((prev) => ({
                          from: d,
                          to: prev?.to && d <= prev.to ? prev.to : d,
                        }));
                        setDraftPeriod(null);
                      }}
                      className="h-8 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                  <span className="text-zinc-600 mt-4">–</span>
                  <div className="flex-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1 block">
                      {t("endDate")}
                    </label>
                    <input
                      type="date"
                      value={
                        draftRange?.to
                          ? dayjs(draftRange.to).format("YYYY-MM-DD")
                          : ""
                      }
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const d = new Date(e.target.value + "T00:00:00");
                        setDraftRange((prev) => ({
                          from: prev?.from && d >= prev.from ? prev.from : d,
                          to: d,
                        }));
                        setDraftPeriod(null);
                      }}
                      className="h-8 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>

                <Calendar
                  mode="range"
                  selected={draftRange}
                  onSelect={handleCalendarSelect}
                  numberOfMonths={2}
                  defaultMonth={defaultMonth}
                  locale={calendarLocale}
                  weekStartsOn={1}
                  className="p-3"
                  classNames={{
                    months:
                      "relative flex flex-row gap-4",
                    month_caption:
                      "flex h-8 w-full items-center justify-center px-8",
                    caption_label: "text-xs font-semibold text-zinc-300",
                    nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between",
                    table: "w-full border-collapse",
                    weekday:
                      "flex-1 text-[10px] font-medium text-zinc-500 select-none w-8 text-center",
                    day: "group/day relative aspect-square h-full w-full p-0 text-center select-none [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
                    today:
                      "rounded-md bg-indigo-600/15 text-indigo-300 data-[selected=true]:rounded-none",
                    outside: "text-zinc-700 aria-selected:text-zinc-500",
                    range_start: "rounded-l-md bg-indigo-600/20",
                    range_middle: "rounded-none bg-indigo-600/10",
                    range_end: "rounded-r-md bg-indigo-600/20",
                  }}
                />

                <div className="flex items-center justify-end gap-2 px-4 pb-3 pt-1 border-t border-zinc-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetDraft();
                      setDesktopOpen(false);
                    }}
                    className="h-8 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={applySelection}
                    disabled={!canApply}
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40"
                  >
                    {t("apply")}
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Mobile trigger + Drawer ────────────────────────── */}
      <div className="sm:hidden flex-1">
        <button
          onClick={() => {
            setMobileView("presets");
            resetDraft();
            setMobileOpen(true);
          }}
          className={cn(
            "flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-semibold transition-all w-full justify-between",
            "border-zinc-800 bg-zinc-900/80 text-zinc-300"
          )}
        >
          <span className="flex items-center gap-2">
            <IconCalendar size={14} />
            {activeLabel}
          </span>
          <IconChevronDown size={12} className="text-zinc-500" />
        </button>

        <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
          <DrawerContent className="bg-zinc-950 border-zinc-800 max-h-[85vh]">
            {mobileView === "presets" ? (
              <>
                <DrawerHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-zinc-800">
                  <DrawerTitle className="text-sm font-semibold text-zinc-200">
                    {t("period")}
                  </DrawerTitle>
                  <DrawerClose asChild>
                    <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                      <IconX size={18} />
                    </button>
                  </DrawerClose>
                </DrawerHeader>
                <ScrollArea className="flex-1 overflow-auto">
                  <div className="p-2 space-y-0.5">
                    <button
                      onClick={handleMobileCustomOpen}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-colors",
                        hasRange
                          ? "text-indigo-400"
                          : "text-zinc-300 hover:bg-zinc-800/60"
                      )}
                    >
                      {t("custom")}
                      {hasRange && <IconCheck size={16} />}
                    </button>

                    <div className="mx-4 h-px bg-zinc-800" />

                    {PRESET_OPTIONS.map((period) => {
                      const isActive = activePeriod === period;
                      return (
                        <button
                          key={period}
                          onClick={() => handleMobilePresetApply(period)}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "text-indigo-400"
                              : "text-zinc-300 hover:bg-zinc-800/60"
                          )}
                        >
                          {t(TRANSLATION_MAP[period])}
                          {isActive && <IconCheck size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <>
                <DrawerHeader className="flex flex-row items-center justify-between px-4 py-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMobileView("presets")}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <IconArrowLeft size={18} />
                    </button>
                    <DrawerTitle className="text-sm font-semibold text-zinc-200">
                      {t("custom")}
                    </DrawerTitle>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleMobileSave}
                    disabled={!draftRange?.from || !draftRange?.to}
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40"
                  >
                    {t("save")}
                  </Button>
                </DrawerHeader>

                <div className="px-4 py-3 border-b border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-200 text-center">
                    {draftRange?.from && draftRange?.to
                      ? formatRangeLabel(
                          dayjs(draftRange.from).format("YYYY-MM-DD"),
                          dayjs(draftRange.to).format("YYYY-MM-DD")
                        )
                      : draftRange?.from
                        ? `${dayjs(draftRange.from).format("D [de] MMM.")} – ...`
                        : "–"}
                  </p>
                </div>

                <div className="flex justify-center overflow-auto pb-4">
                  <Calendar
                    mode="range"
                    selected={draftRange}
                    onSelect={handleCalendarSelect}
                    numberOfMonths={1}
                    defaultMonth={defaultMonth}
                    locale={calendarLocale}
                    weekStartsOn={1}
                    className="p-3"
                    classNames={{
                      month_caption:
                        "flex h-8 w-full items-center justify-center px-8",
                      caption_label: "text-xs font-semibold text-zinc-300",
                      nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between",
                      table: "w-full border-collapse",
                      weekday:
                        "flex-1 text-[10px] font-medium text-zinc-500 select-none w-8 text-center",
                      day: "group/day relative aspect-square h-full w-full p-0 text-center select-none [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
                      today:
                        "rounded-md bg-indigo-600/15 text-indigo-300 data-[selected=true]:rounded-none",
                      outside: "text-zinc-700 aria-selected:text-zinc-500",
                      range_start: "rounded-l-md bg-indigo-600/20",
                      range_middle: "rounded-none bg-indigo-600/10",
                      range_end: "rounded-r-md bg-indigo-600/20",
                    }}
                  />
                </div>
              </>
            )}
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
