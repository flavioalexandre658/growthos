"use client";

import { Suspense } from "react";
import { IconSearch, IconX, IconFilter } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PeriodFilter } from "@/app/[slug]/_components/period-filter";
import { cn } from "@/lib/utils";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

const EVENT_TYPE_COLORS: Record<string, string> = {
  purchase: "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",
  renewal: "bg-sky-600/20 text-sky-300 border-sky-600/30",
  refund: "bg-orange-600/20 text-orange-300 border-orange-600/30",
  checkout_started: "bg-amber-600/20 text-amber-300 border-amber-600/30",
  checkout_abandoned: "bg-red-600/20 text-red-300 border-red-600/30",
  signup: "bg-indigo-600/20 text-indigo-300 border-indigo-600/30",
  trial_started: "bg-violet-600/20 text-violet-300 border-violet-600/30",
  subscription_canceled: "bg-red-600/20 text-red-300 border-red-600/30",
  subscription_changed: "bg-cyan-600/20 text-cyan-300 border-cyan-600/30",
};

export function getEventTypeBadgeClass(eventType: string) {
  return EVENT_TYPE_COLORS[eventType] ?? "bg-zinc-700/40 text-zinc-300 border-zinc-600/30";
}

interface EventsFiltersProps {
  filter: IDateFilter;
  search: string;
  selectedEventTypes: string[];
  selectedSource: string;
  selectedDevice: string;
  selectedBillingType: string;
  selectedProvider: string;
  minValue: string;
  maxValue: string;
  distinctEventTypes: string[];
  distinctSources: string[];
  distinctDevices: string[];
  distinctProviders: string[];
  onSearch: (v: string) => void;
  onToggleEventType: (v: string) => void;
  onSource: (v: string) => void;
  onDevice: (v: string) => void;
  onBillingType: (v: string) => void;
  onProvider: (v: string) => void;
  onMinValue: (v: string) => void;
  onMaxValue: (v: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function EventsFilters({
  filter,
  search,
  selectedEventTypes,
  selectedSource,
  selectedDevice,
  selectedBillingType,
  selectedProvider,
  minValue,
  maxValue,
  distinctEventTypes,
  distinctSources,
  distinctDevices,
  distinctProviders,
  onSearch,
  onToggleEventType,
  onSource,
  onDevice,
  onBillingType,
  onProvider,
  onMinValue,
  onMaxValue,
  onClear,
  hasActiveFilters,
}: EventsFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="relative w-full">
        <IconSearch
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <Input
          placeholder="Buscar session_id, customer_id, product_id ou nome do produto..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-8 h-8 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-xs font-mono"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Suspense>
          <PeriodFilter filter={filter} />
        </Suspense>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 border border-zinc-700/50"
          >
            <IconX size={12} />
            Limpar
          </Button>
        )}
      </div>

      <div className="flex items-start gap-2">
        <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
          <IconFilter size={12} className="text-zinc-600" />
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">
            Tipo
          </span>
        </div>
        <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
          <div className="flex gap-1.5 w-max">
            {distinctEventTypes.map((et) => (
              <button
                key={et}
                type="button"
                onClick={() => onToggleEventType(et)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] font-mono font-semibold transition-all whitespace-nowrap",
                  selectedEventTypes.includes(et)
                    ? getEventTypeBadgeClass(et)
                    : "border-zinc-700/50 bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                )}
              >
                {et}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold shrink-0">
            Cobrança
          </span>
          <select
            value={selectedBillingType}
            onChange={(e) => onBillingType(e.target.value)}
            className="h-8 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">Todos</option>
            <option value="recurring">Assinatura</option>
            <option value="one_time">Avulso</option>
          </select>
        </div>

        {distinctProviders.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold shrink-0">
              Provider
            </span>
            <select
              value={selectedProvider}
              onChange={(e) => onProvider(e.target.value)}
              className="h-8 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Todos</option>
              {distinctProviders.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}

        {distinctSources.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold shrink-0">
              Canal
            </span>
            <select
              value={selectedSource}
              onChange={(e) => onSource(e.target.value)}
              className="h-8 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Todos</option>
              {distinctSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {distinctDevices.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold shrink-0">
              Device
            </span>
            <select
              value={selectedDevice}
              onChange={(e) => onDevice(e.target.value)}
              className="h-8 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Todos</option>
              {distinctDevices.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold shrink-0">
            Valor
          </span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="Min"
              value={minValue}
              onChange={(e) => onMinValue(e.target.value)}
              className="h-8 w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-300 placeholder:text-zinc-700 focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-zinc-700 text-xs shrink-0">–</span>
            <input
              type="number"
              placeholder="Max"
              value={maxValue}
              onChange={(e) => onMaxValue(e.target.value)}
              className="h-8 w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-300 placeholder:text-zinc-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
