"use client";

import { ICategoryData, ICategoryParams, OrderDirection, IPaginationMeta } from "@/interfaces/dashboard.interface";
import { ResponsiveTable, TableColumn, ServerPaginationConfig } from "@/components/ui/responsive-table";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { fmtInt, fmtBRL, fmtBRLDecimal } from "@/utils/format";

type CategoryOrderBy = NonNullable<ICategoryParams["order_by"]>;

function conversionColor(value: string) {
  const n = parseFloat(value);
  if (n >= 35) return "text-emerald-400";
  if (n >= 20) return "text-amber-400";
  return "text-red-400";
}

const SORT_OPTIONS: { key: CategoryOrderBy; label: string }[] = [
  { key: "revenue", label: "Receita" },
  { key: "payments", label: "Pagamentos" },
  { key: "edits", label: "Edições" },
  { key: "conversion_rate", label: "Conversão" },
  { key: "ticket_medio", label: "Ticket" },
];

interface CategoriesTableProps {
  data: ICategoryData[];
  pagination: IPaginationMeta;
  isLoading: boolean;
  orderBy: CategoryOrderBy;
  orderDir: OrderDirection;
  onOrderBy: (key: CategoryOrderBy) => void;
  onOrderDir: (dir: OrderDirection) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function CategoriesTable({
  data,
  pagination,
  isLoading,
  orderBy,
  orderDir,
  onOrderBy,
  onOrderDir,
  onPageChange,
  onPageSizeChange,
}: CategoriesTableProps) {
  const handleSort = (key: CategoryOrderBy) => {
    if (key === orderBy) {
      onOrderDir(orderDir === "DESC" ? "ASC" : "DESC");
    } else {
      onOrderBy(key);
      onOrderDir("DESC");
    }
    onPageChange(1);
  };

  const serverPagination: ServerPaginationConfig = {
    page: pagination.page,
    pageSize: pagination.limit,
    total: pagination.total,
    totalPages: pagination.total_pages,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions: [10, 25, 50],
  };

  const columns: TableColumn<ICategoryData>[] = [
    {
      key: "name",
      header: "Categoria",
      mobilePrimary: true,
      render: (c) => <span className="font-semibold text-sm text-zinc-200">{c.name}</span>,
    },
    {
      key: "edits",
      header: "Edições",
      align: "right",
      render: (c) => <span className="font-mono text-sm text-zinc-400">{fmtInt(c.edits)}</span>,
    },
    {
      key: "payments",
      header: "Pagos",
      align: "right",
      render: (c) => <span className="font-mono text-sm font-semibold text-emerald-400">{fmtInt(c.payments)}</span>,
    },
    {
      key: "conversion_rate",
      header: "Conversão",
      align: "right",
      render: (c) => (
        <span className={cn("font-mono text-sm font-semibold", conversionColor(String(c.conversion_rate)))}>
          {c.conversion_rate}%
        </span>
      ),
    },
    {
      key: "revenue",
      header: "Receita Bruta",
      align: "right",
      render: (c) => <span className="font-mono text-sm font-bold text-emerald-400">{fmtBRL(c.revenue)}</span>,
    },
    {
      key: "net_revenue",
      header: "Receita Líq.",
      align: "right",
      render: (c) => <span className="font-mono text-sm text-cyan-400">{fmtBRL(c.net_revenue)}</span>,
    },
    {
      key: "ticket_medio",
      header: "Ticket",
      align: "right",
      render: (c) => <span className="font-mono text-sm text-zinc-300">{fmtBRLDecimal(c.ticket_medio)}</span>,
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      data={data}
      getRowKey={(c) => c.uuid}
      isLoading={isLoading}
      serverPagination={serverPagination}
      emptyMessage="Nenhuma categoria encontrada no período"
      header={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Receita por Categoria</h3>
            <p className="mt-0.5 text-xs text-zinc-500">Performance financeira por categoria de convite</p>
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {SORT_OPTIONS.map((s) => {
              const isActive = orderBy === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => handleSort(s.key)}
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors",
                    isActive
                      ? "border-indigo-600/50 bg-indigo-600/20 text-indigo-400"
                      : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                  )}
                >
                  {s.label}
                  {isActive && (orderDir === "DESC" ? <IconChevronDown size={10} /> : <IconChevronUp size={10} />)}
                </button>
              );
            })}
          </div>
        </div>
      }
    />
  );
}
