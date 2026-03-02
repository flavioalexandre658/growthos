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
import type { IActiveSubscription } from "@/interfaces/mrr.interface";

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  trialing: "Trial",
  past_due: "Em atraso",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  trialing: "secondary",
  past_due: "destructive",
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

interface ActiveSubscriptionsTableProps {
  organizationId: string;
}

export function ActiveSubscriptionsTable({ organizationId }: ActiveSubscriptionsTableProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useActiveSubscriptions(organizationId, page);

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
      key: "interval",
      header: "Ciclo",
      mobileHide: true,
      render: (row) => (
        <span className="text-xs text-zinc-500">
          {INTERVAL_LABELS[row.billingInterval] ?? row.billingInterval}
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

  return (
    <ResponsiveTable
      columns={columns}
      data={data?.data ?? []}
      getRowKey={(row) => row.subscriptionId}
      isLoading={isLoading}
      skeletonRows={5}
      emptyMessage="Nenhuma assinatura ativa"
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
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Assinaturas Ativas</h3>
          <p className="text-xs text-zinc-500">
            {data?.pagination.total ?? 0} assinaturas no total
          </p>
        </div>
      }
    />
  );
}
