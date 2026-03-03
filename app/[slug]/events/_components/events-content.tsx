"use client";

import { useState } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import { useEvents } from "@/hooks/queries/use-events";
import { useDebounce } from "@/hooks/use-debounce";
import { exportEvents } from "@/actions/events/export-events.action";
import type { IDateFilter, OrderDirection } from "@/interfaces/dashboard.interface";
import type { IEventParams } from "@/interfaces/event.interface";
import { EventHealthStatus } from "./event-health-status";
import { EventsFilters } from "./events-filters";
import { EventsTable } from "./events-table";
import { IconList, IconDownload, IconLoader2 } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

const EMPTY_PAGINATION = { page: 1, limit: 25, total: 0, total_pages: 0 };

interface EventsContentProps {
  filter: IDateFilter;
  initialEventTypes?: string[];
}

function getFilterLabel(filter: IDateFilter): string {
  if (filter.period) {
    const labels: Record<string, string> = {
      today: "hoje",
      yesterday: "ontem",
      "7d": "últimos 7 dias",
      "30d": "últimos 30 dias",
      "90d": "últimos 90 dias",
    };
    return labels[filter.period] ?? filter.period;
  }
  if (filter.start_date && filter.end_date) {
    const from = dayjs(filter.start_date).format("D MMM");
    const to = dayjs(filter.end_date).format("D MMM");
    return `${from} – ${to}`;
  }
  return "período";
}

export function EventsContent({ filter, initialEventTypes = [] }: EventsContentProps) {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [orderDir] = useState<OrderDirection>("DESC");
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>(initialEventTypes);
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const params: IEventParams = {
    ...filter,
    page,
    limit,
    order_dir: orderDir,
    search: debouncedSearch || undefined,
    event_types: selectedEventTypes.length > 0 ? selectedEventTypes : undefined,
    source: selectedSource || undefined,
    device: selectedDevice || undefined,
    min_value: minValue ? Number(minValue) * 100 : undefined,
    max_value: maxValue ? Number(maxValue) * 100 : undefined,
  };

  const { data: resp, isPending: isLoading } = useEvents(orgId, params);

  const events = resp?.data ?? [];
  const pagination = resp?.pagination ?? EMPTY_PAGINATION;
  const distinctEventTypes = resp?.distinctEventTypes ?? [];
  const distinctSources = resp?.distinctSources ?? [];
  const distinctDevices = resp?.distinctDevices ?? [];

  const toggleEventType = (et: string) => {
    setSelectedEventTypes((prev) =>
      prev.includes(et) ? prev.filter((t) => t !== et) : [...prev, et]
    );
    setPage(1);
  };

  const hasActiveFilters =
    search.length > 0 ||
    selectedEventTypes.length > 0 ||
    !!selectedSource ||
    !!selectedDevice ||
    !!minValue ||
    !!maxValue;

  const handleClearFilters = () => {
    setSearch("");
    setSelectedEventTypes([]);
    setSelectedSource("");
    setSelectedDevice("");
    setMinValue("");
    setMaxValue("");
    setPage(1);
  };

  const handleExport = async () => {
    if (!orgId || isExporting) return;
    setIsExporting(true);
    try {
      const exportParams: IEventParams = { ...params };
      delete exportParams.page;
      delete exportParams.limit;
      const { csv, filename } = await exportEvents(orgId, exportParams);
      if (!csv) return;
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const periodLabel = getFilterLabel(filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-600/30 shrink-0">
            <IconList size={16} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Eventos</h1>
            <p className="text-xs text-zinc-500">
              Log em tempo real de todos os eventos recebidos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pagination.total > 0 && (
            <div className="text-xs text-zinc-600 font-mono bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
              <span className="text-zinc-400 font-semibold">{pagination.total.toLocaleString("pt-BR")}</span>
              <span className="mx-1 text-zinc-700">·</span>
              <span>{periodLabel}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || pagination.total === 0}
            title="Exportar CSV"
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <IconLoader2 size={13} className="animate-spin" />
            ) : (
              <IconDownload size={13} />
            )}
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      <EventHealthStatus />

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <EventsFilters
          filter={filter}
          search={search}
          selectedEventTypes={selectedEventTypes}
          selectedSource={selectedSource}
          selectedDevice={selectedDevice}
          minValue={minValue}
          maxValue={maxValue}
          distinctEventTypes={distinctEventTypes}
          distinctSources={distinctSources}
          distinctDevices={distinctDevices}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          onToggleEventType={toggleEventType}
          onSource={(v) => { setSelectedSource(v); setPage(1); }}
          onDevice={(v) => { setSelectedDevice(v); setPage(1); }}
          onMinValue={(v) => { setMinValue(v); setPage(1); }}
          onMaxValue={(v) => { setMaxValue(v); setPage(1); }}
          onClear={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      <EventsTable
        organizationId={orgId ?? ""}
        data={events}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />
    </div>
  );
}
