"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveTable,
  type TableColumn,
} from "@/components/ui/responsive-table";
import { useActiveSubscriptions } from "@/hooks/queries/use-active-subscriptions";
import { useOrganization } from "@/components/providers/organization-provider";
import { normalizeToMonthly, INTERVAL_LABELS } from "@/utils/billing";
import { fmtBRLDecimal } from "@/utils/format";
import { formatDate } from "@/utils/format-date";
import dayjs from "dayjs";
import type {
  IActiveSubscription,
  SubscriptionStatusFilter,
  BillingIntervalFilter,
  NextBillingFilter,
  SubscriptionSortField,
  SortDirection,
} from "@/interfaces/mrr.interface";

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  trialing: "Trial",
  past_due: "Em atraso",
  canceled: "Cancelado",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  trialing: "secondary",
  past_due: "destructive",
  canceled: "outline",
};

const STATUS_FILTERS: { label: string; value: SubscriptionStatusFilter }[] = [
  { label: "Ativo", value: "active" },
  { label: "Todos", value: "all" },
  { label: "Trial", value: "trialing" },
  { label: "Em atraso", value: "past_due" },
  { label: "Cancelado", value: "canceled" },
];

const INTERVAL_FILTERS: { label: string; value: BillingIntervalFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Mensal", value: "monthly" },
  { label: "Trimestral", value: "quarterly" },
  { label: "Semestral", value: "semiannual" },
  { label: "Anual", value: "yearly" },
  { label: "Semanal", value: "weekly" },
];

const NEXT_BILLING_FILTERS: { label: string; value: NextBillingFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Hoje", value: "today" },
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
];

interface ActiveSubscriptionsTableProps {
  organizationId: string;
}

export function ActiveSubscriptionsTable({ organizationId }: ActiveSubscriptionsTableProps) {
  const { organization } = useOrganization();
  const timezone = organization?.timezone ?? "America/Sao_Paulo";
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatusFilter>("active");
  const [planId, setPlanId] = useState<string | undefined>();
  const [billingInterval, setBillingInterval] = useState<BillingIntervalFilter>("all");
  const [nextBilling, setNextBilling] = useState<NextBillingFilter>("all");
  const [sortField, setSortField] = useState<SubscriptionSortField>("nextBilling");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const { data, isLoading } = useActiveSubscriptions(organizationId, {
    page,
    status: statusFilter,
    planId,
    billingInterval,
    nextBilling,
    sortField,
    sortDir,
  });

  const resetPage = () => setPage(1);

  const handleStatusChange = (status: SubscriptionStatusFilter) => {
    setStatusFilter(status);
    resetPage();
  };

  const handleBillingIntervalChange = (interval: BillingIntervalFilter) => {
    setBillingInterval(interval);
    resetPage();
  };

  const handleNextBillingChange = (filter: NextBillingFilter) => {
    setNextBilling(filter);
    resetPage();
  };

  const handleSort = useCallback(
    (key: string) => {
      const field = key as SubscriptionSortField;
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
      resetPage();
    },
    [sortField]
  );

  const columns: TableColumn<IActiveSubscription>[] = [
    {
      key: "customerId",
      header: "Cliente",
      mobilePrimary: true,
      render: (row) => (
        <span className="font-mono text-xs text-zinc-400">{row.customerId.slice(0, 16)}…</span>
      ),
      mobileRender: (row) => (
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">{row.planName}</p>
            <p className="text-[10px] text-zinc-500 font-mono truncate">{row.customerId.slice(0, 20)}…</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-sm font-bold text-emerald-400">
              {fmtBRLDecimal(row.valueInCents / 100)}
            </p>
            <p className="text-[10px] text-zinc-600">
              {INTERVAL_LABELS[row.billingInterval] ?? row.billingInterval}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "planName",
      header: "Plano",
      mobileHide: true,
      render: (row) => (
        <div className="min-w-0">
          <span className="text-sm font-medium text-zinc-200 block truncate max-w-[200px]">{row.planName}</span>
          <span className="text-[10px] text-zinc-600">
            {INTERVAL_LABELS[row.billingInterval] ?? row.billingInterval}
          </span>
        </div>
      ),
    },
    {
      key: "value",
      header: "Valor",
      align: "right",
      mobileHide: true,
      sortKey: "value",
      onSort: handleSort,
      currentSortKey: sortField,
      currentSortDir: sortDir,
      render: (row) => {
        const monthly = normalizeToMonthly(row.valueInCents, row.billingInterval);
        const isNonMonthly = row.billingInterval !== "monthly" && row.billingInterval !== "weekly";
        return (
          <div className="text-right">
            <span className="font-mono text-sm font-bold text-emerald-400">
              {fmtBRLDecimal(row.valueInCents / 100)}
            </span>
            {isNonMonthly && (
              <div className="text-[10px] text-zinc-600 font-mono">
                {fmtBRLDecimal(monthly / 100)}/mês
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "ltv",
      header: "LTV Acum.",
      align: "right",
      mobileHide: true,
      sortKey: "ltv",
      onSort: handleSort,
      currentSortKey: sortField,
      currentSortDir: sortDir,
      render: (row) => (
        <span className="font-mono text-xs text-amber-400">
          {fmtBRLDecimal(row.estimatedLtvInCents / 100)}
        </span>
      ),
    },
    {
      key: "renewals",
      header: "Renovações",
      align: "right",
      sortKey: "renewals",
      onSort: handleSort,
      currentSortKey: sortField,
      currentSortDir: sortDir,
      render: (row) => {
        if (row.renewalCount === 0) {
          return (
            <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/60 rounded-full px-2 py-0.5">
              1ª cobrança
            </span>
          );
        }
        return (
          <span className="text-xs text-zinc-500">
            {row.renewalCount}×{" "}
            <span className="text-zinc-600">
              {INTERVAL_LABELS[row.billingInterval] ?? row.billingInterval}
            </span>
          </span>
        );
      },
    },
    {
      key: "nextBilling",
      header: "Próx. cobrança",
      sortKey: "nextBilling",
      onSort: handleSort,
      currentSortKey: sortField,
      currentSortDir: sortDir,
      render: (row) => (
        <span className="text-xs text-zinc-500">
          {row.nextBillingAt
            ? formatDate(row.nextBillingAt, timezone, "DD/MM/YYYY")
            : <span className="text-zinc-700">—</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status] ?? "outline"} className="text-[10px]">
          {STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "startedAt",
      header: "Desde",
      mobileHide: true,
      sortKey: "startedAt",
      onSort: handleSort,
      currentSortKey: sortField,
      currentSortDir: sortDir,
      render: (row) => (
        <span className="text-xs text-zinc-500">
          {formatDate(row.startedAt, timezone, "DD/MM/YYYY")}
        </span>
      ),
    },
  ];

  const availablePlans = data?.availablePlans ?? [];

  const filterBar = (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleStatusChange(f.value)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              statusFilter === f.value
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {availablePlans.length > 1 && (
          <Select
            value={planId ?? "all"}
            onValueChange={(v) => {
              setPlanId(v === "all" ? undefined : v);
              resetPage();
            }}
          >
            <SelectTrigger className="h-7 w-48 bg-zinc-900 border-zinc-700 text-zinc-300 text-xs">
              <SelectValue placeholder="Todos os planos" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all" className="text-zinc-300 focus:bg-zinc-800 text-xs">
                Todos os planos
              </SelectItem>
              {availablePlans.map((p) => (
                <SelectItem
                  key={p.planId}
                  value={p.planId}
                  className="text-zinc-300 focus:bg-zinc-800 text-xs"
                >
                  {p.planName}
                  <span className="ml-1 text-zinc-500">({p.count})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-1">
          {INTERVAL_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleBillingIntervalChange(f.value)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                billingInterval === f.value
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-600 mr-0.5">Próx:</span>
          {NEXT_BILLING_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleNextBillingChange(f.value)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                nextBilling === f.value
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <ResponsiveTable
      columns={columns}
      data={data?.data ?? []}
      getRowKey={(row) => row.subscriptionId}
      isLoading={isLoading}
      skeletonRows={5}
      emptyMessage="Nenhuma assinatura encontrada"
      serverPagination={
        data
          ? {
              page: data.pagination.page,
              pageSize: data.pagination.limit,
              total: data.pagination.total,
              totalPages: data.pagination.total_pages,
              onPageChange: setPage,
              onPageSizeChange: () => {},
            }
          : undefined
      }
      header={
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Assinaturas</h3>
              <p className="text-xs text-zinc-500">
                {data?.pagination.total ?? 0} assinaturas no total
              </p>
            </div>
          </div>
          {filterBar}
        </div>
      }
    />
  );
}
