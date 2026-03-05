"use client";

import { useState } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import { useSubscriptions } from "@/hooks/queries/use-subscriptions";
import { useDebounce } from "@/hooks/use-debounce";
import { exportSubscriptions } from "@/actions/subscriptions/export-subscriptions.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { ISubscriptionParams } from "@/interfaces/subscription.interface";
import { SubscriptionsFilters } from "./subscriptions-filters";
import { SubscriptionsTable } from "./subscriptions-table";
import { IconRepeat, IconDownload, IconLoader2 } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

const EMPTY_PAGINATION = { page: 1, limit: 25, total: 0, total_pages: 0 };

interface SubscriptionsContentProps {
  filter: IDateFilter;
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

export function SubscriptionsContent({ filter }: SubscriptionsContentProps) {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedInterval, setSelectedInterval] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const params: ISubscriptionParams = {
    ...filter,
    page,
    limit,
    search: debouncedSearch || undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    plan_id: selectedPlanId || undefined,
    billing_interval: selectedInterval || undefined,
    order_dir: "DESC",
  };

  const { data: resp, isPending: isLoading } = useSubscriptions(orgId, params);

  const items = resp?.data ?? [];
  const pagination = resp?.pagination ?? EMPTY_PAGINATION;
  const distinctPlans = resp?.distinctPlans ?? [];
  const distinctIntervals = resp?.distinctIntervals ?? [];

  const hasActiveFilters =
    search.length > 0 ||
    (selectedStatus !== "active" && selectedStatus !== "all") ||
    !!selectedPlanId ||
    !!selectedInterval;

  const handleClearFilters = () => {
    setSearch("");
    setSelectedStatus("active");
    setSelectedPlanId("");
    setSelectedInterval("");
    setPage(1);
  };

  const handleExport = async () => {
    if (!orgId || isExporting) return;
    setIsExporting(true);
    try {
      const exportParams: ISubscriptionParams = { ...params };
      delete exportParams.page;
      delete exportParams.limit;
      const { csv, filename } = await exportSubscriptions(orgId, exportParams);
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
            <IconRepeat size={16} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Assinaturas</h1>
            <p className="text-xs text-zinc-500">
              Registro completo de todas as assinaturas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pagination.total > 0 && (
            <div className="text-xs text-zinc-600 font-mono bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
              <span className="text-zinc-400 font-semibold">
                {pagination.total.toLocaleString("pt-BR")}
              </span>
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

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <SubscriptionsFilters
          filter={filter}
          search={search}
          selectedStatus={selectedStatus}
          selectedPlanId={selectedPlanId}
          selectedInterval={selectedInterval}
          distinctPlans={distinctPlans}
          distinctIntervals={distinctIntervals}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          onStatus={(v) => {
            setSelectedStatus(v);
            setPage(1);
          }}
          onPlan={(v) => {
            setSelectedPlanId(v);
            setPage(1);
          }}
          onInterval={(v) => {
            setSelectedInterval(v);
            setPage(1);
          }}
          onClear={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      <SubscriptionsTable
        data={items}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setLimit(s);
          setPage(1);
        }}
      />
    </div>
  );
}
