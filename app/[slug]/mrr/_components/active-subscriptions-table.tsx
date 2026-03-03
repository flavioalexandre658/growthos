"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveTable,
  type TableColumn,
} from "@/components/ui/responsive-table";
import { useActiveSubscriptions } from "@/hooks/queries/use-active-subscriptions";
import { fmtBRLDecimal } from "@/utils/format";
import dayjs from "dayjs";
import type { IActiveSubscription, SubscriptionStatusFilter } from "@/interfaces/mrr.interface";

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

const INTERVAL_LABELS: Record<string, string> = {
  monthly: "Mensal",
  yearly: "Anual",
  weekly: "Semanal",
};

function normalizeToMonthly(valueInCents: number, interval: string): number {
  if (interval === "yearly") return Math.round(valueInCents / 12);
  if (interval === "weekly") return Math.round(valueInCents * 4.33);
  return valueInCents;
}

const STATUS_FILTERS: { label: string; value: SubscriptionStatusFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Ativo", value: "active" },
  { label: "Trial", value: "trialing" },
  { label: "Em atraso", value: "past_due" },
  { label: "Cancelado", value: "canceled" },
];

interface ActiveSubscriptionsTableProps {
  organizationId: string;
}

export function ActiveSubscriptionsTable({ organizationId }: ActiveSubscriptionsTableProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatusFilter>("all");

  const { data, isLoading } = useActiveSubscriptions(organizationId, page, statusFilter);

  const handleStatusChange = (status: SubscriptionStatusFilter) => {
    setStatusFilter(status);
    setPage(1);
  };

  const columns: TableColumn<IActiveSubscription>[] = [
    {
      key: "customerId",
      header: "Cliente",
      mobilePrimary: true,
      render: (row) => (
        <span className="font-mono text-xs text-zinc-300">{row.customerId}</span>
      ),
    },
    {
      key: "planName",
      header: "Plano",
      render: (row) => (
        <span className="text-sm font-medium text-zinc-200">{row.planName}</span>
      ),
    },
    {
      key: "value",
      header: "Valor/mês",
      align: "right",
      render: (row) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          {fmtBRLDecimal(normalizeToMonthly(row.valueInCents, row.billingInterval) / 100)}
        </span>
      ),
    },
    {
      key: "ltv",
      header: "LTV Acum.",
      align: "right",
      mobileHide: true,
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
      mobileHide: true,
      render: (row) => (
        <span className="text-xs text-zinc-500">
          {row.renewalCount}× {INTERVAL_LABELS[row.billingInterval] ?? row.billingInterval}
        </span>
      ),
    },
    {
      key: "nextBilling",
      header: "Próx. cobrança",
      mobileHide: true,
      render: (row) => (
        <span className="text-xs text-zinc-500">
          {row.nextBillingAt
            ? dayjs(row.nextBillingAt).format("DD/MM/YYYY")
            : row.status === "canceled"
              ? <span className="text-zinc-700">—</span>
              : "—"}
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
      render: (row) => (
        <span className="text-xs text-zinc-500">
          {dayjs(row.startedAt).format("DD/MM/YYYY")}
        </span>
      ),
    },
  ];

  const filterBar = (
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Assinaturas</h3>
            <p className="text-xs text-zinc-500">
              {data?.pagination.total ?? 0} assinaturas no total
            </p>
          </div>
          {filterBar}
        </div>
      }
    />
  );
}
