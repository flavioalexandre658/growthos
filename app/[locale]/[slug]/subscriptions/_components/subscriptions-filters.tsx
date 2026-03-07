"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { IconSearch, IconX, IconFilter } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PeriodFilter } from "@/app/[locale]/[slug]/_components/period-filter";
import { cn } from "@/lib/utils";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

const STATUS_BADGE_CLASSES: Record<string, string> = {
  active: "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",
  trialing: "bg-violet-600/20 text-violet-300 border-violet-600/30",
  past_due: "bg-amber-600/20 text-amber-300 border-amber-600/30",
  canceled: "bg-red-600/20 text-red-300 border-red-600/30",
};

export function getStatusBadgeClass(status: string) {
  return STATUS_BADGE_CLASSES[status] ?? "bg-zinc-700/40 text-zinc-300 border-zinc-600/30";
}

interface SubscriptionsFiltersProps {
  filter: IDateFilter;
  search: string;
  selectedStatus: string;
  selectedPlanId: string;
  selectedInterval: string;
  distinctPlans: { planId: string; planName: string }[];
  distinctIntervals: string[];
  onSearch: (v: string) => void;
  onStatus: (v: string) => void;
  onPlan: (v: string) => void;
  onInterval: (v: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function SubscriptionsFilters({
  filter,
  search,
  selectedStatus,
  selectedPlanId,
  selectedInterval,
  distinctPlans,
  distinctIntervals,
  onSearch,
  onStatus,
  onPlan,
  onInterval,
  onClear,
  hasActiveFilters,
}: SubscriptionsFiltersProps) {
  const t = useTranslations("subscriptions.filters");
  const tTable = useTranslations("subscriptions.table");

  const STATUS_FILTERS = [
    { value: "all", label: t("statusFilters.all") },
    { value: "active", label: t("statusFilters.active") },
    { value: "trialing", label: t("statusFilters.trialing") },
    { value: "past_due", label: t("statusFilters.past_due") },
    { value: "canceled", label: t("statusFilters.canceled") },
  ];

  const BILLING_INTERVAL_LABELS: Record<string, string> = {
    monthly: tTable("billingIntervals.monthly"),
    quarterly: tTable("billingIntervals.quarterly"),
    semiannual: tTable("billingIntervals.semiannual"),
    yearly: tTable("billingIntervals.yearly"),
    weekly: tTable("billingIntervals.weekly"),
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Suspense>
          <PeriodFilter filter={filter} />
        </Suspense>

        <div className="relative flex-1 min-w-0">
          <IconSearch
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-8 h-8 bg-zinc-900 border-zinc-800 text-zinc-200 text-xs placeholder:text-zinc-600 focus:border-indigo-500/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <IconX size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <IconFilter size={11} className="text-zinc-600 shrink-0" />
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">
            {t("statusLabel")}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onStatus(s.value)}
              className={cn(
                "rounded-md border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                selectedStatus === s.value
                  ? "bg-indigo-600/20 text-indigo-300 border-indigo-600/40"
                  : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {distinctPlans.length > 0 && (
          <Select value={selectedPlanId || "all"} onValueChange={(v) => onPlan(v === "all" ? "" : v)}>
            <SelectTrigger className="h-7 w-auto min-w-[120px] max-w-[180px] bg-zinc-900 border-zinc-800 text-zinc-300 text-xs">
              <SelectValue placeholder={t("planPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all" className="text-zinc-300 focus:bg-zinc-800 text-xs">
                {t("allPlans")}
              </SelectItem>
              {distinctPlans.map((p) => (
                <SelectItem
                  key={p.planId}
                  value={p.planId}
                  className="text-zinc-300 focus:bg-zinc-800 text-xs"
                >
                  {p.planName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {distinctIntervals.length > 0 && (
          <Select
            value={selectedInterval || "all"}
            onValueChange={(v) => onInterval(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-7 w-auto min-w-[110px] bg-zinc-900 border-zinc-800 text-zinc-300 text-xs">
              <SelectValue placeholder={t("intervalPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all" className="text-zinc-300 focus:bg-zinc-800 text-xs">
                {t("allIntervals")}
              </SelectItem>
              {distinctIntervals.map((interval) => (
                <SelectItem
                  key={interval}
                  value={interval}
                  className="text-zinc-300 focus:bg-zinc-800 text-xs"
                >
                  {BILLING_INTERVAL_LABELS[interval] ?? interval}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 gap-1.5 text-xs text-zinc-500 hover:text-zinc-100 px-2"
          >
            <IconX size={11} />
            {t("clear")}
          </Button>
        )}
      </div>
    </div>
  );
}
