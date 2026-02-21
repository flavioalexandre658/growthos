"use client";

import { ILandingPageData, ILandingPageParams, OrderDirection, IPaginationMeta } from "@/interfaces/dashboard.interface";
import { ResponsiveTable, TableColumn, ServerPaginationConfig } from "@/components/ui/responsive-table";
import { IconChevronDown, IconChevronUp, IconExternalLink } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type LandingOrderBy = NonNullable<ILandingPageParams["order_by"]>;

function conversionColor(value: string) {
  const n = parseFloat(value);
  if (n >= 30) return "text-emerald-400";
  if (n >= 15) return "text-amber-400";
  return "text-red-400";
}

const SORT_OPTIONS: { key: LandingOrderBy; label: string }[] = [
  { key: "revenue", label: "Receita" },
  { key: "payments", label: "Pagamentos" },
  { key: "edits", label: "Edições" },
  { key: "conversion_rate", label: "Conversão" },
];

function PageLink({ url }: { url: string }) {
  const href = url.startsWith("http") ? url : `https://convitede.com${url}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-indigo-400 shrink-0" title={url}>
        <IconExternalLink size={13} />
      </Button>
    </a>
  );
}

interface LandingPagesTableProps {
  data: ILandingPageData[];
  pagination: IPaginationMeta;
  isLoading: boolean;
  orderBy: LandingOrderBy;
  orderDir: OrderDirection;
  onOrderBy: (key: LandingOrderBy) => void;
  onOrderDir: (dir: OrderDirection) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function LandingPagesTable({
  data,
  pagination,
  isLoading,
  orderBy,
  orderDir,
  onOrderBy,
  onOrderDir,
  onPageChange,
  onPageSizeChange,
}: LandingPagesTableProps) {
  const handleSort = (key: LandingOrderBy) => {
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
    pageSizeOptions: [15, 30, 50],
  };

  const columns: TableColumn<ILandingPageData>[] = [
    {
      key: "page",
      header: "Landing Page",
      mobilePrimary: true,
      render: (lp) => (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-xs text-zinc-300 truncate max-w-[260px] block" title={lp.page}>
            {lp.page}
          </span>
          <PageLink url={lp.page} />
        </div>
      ),
    },
    {
      key: "edits",
      header: "Edições",
      align: "right",
      render: (lp) => <span className="font-mono text-sm text-zinc-400">{lp.edits}</span>,
    },
    {
      key: "payments",
      header: "Pagamentos",
      align: "right",
      render: (lp) => <span className="font-mono text-sm font-semibold text-emerald-400">{lp.payments}</span>,
    },
    {
      key: "conversion_rate",
      header: "Conversão",
      align: "right",
      render: (lp) => (
        <span className={cn("font-mono text-sm font-semibold", conversionColor(String(lp.conversion_rate)))}>
          {lp.conversion_rate}%
        </span>
      ),
    },
    {
      key: "revenue",
      header: "Receita",
      align: "right",
      render: (lp) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          R$ {Number(lp.revenue).toFixed(0)}
        </span>
      ),
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      data={data}
      getRowKey={(lp) => lp.page}
      isLoading={isLoading}
      serverPagination={serverPagination}
      emptyMessage="Nenhuma landing page encontrada no período"
      header={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Landing Pages por Receita</h3>
            <p className="mt-0.5 text-xs text-zinc-500">Páginas de entrada que mais convertem e geram receita</p>
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
