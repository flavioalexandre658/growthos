"use client";

import { ITemplateData, ITemplateParams, OrderDirection } from "@/interfaces/dashboard.interface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveTable, TableColumn, ServerPaginationConfig } from "@/components/ui/responsive-table";
import { IconExternalLink, IconChevronUp, IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { IPaginationMeta } from "@/interfaces/dashboard.interface";

type TemplateOrderBy = NonNullable<ITemplateParams["order_by"]>;

function conversionColor(value: string, low: number, mid: number) {
  const n = parseFloat(value);
  if (n >= mid) return "text-emerald-400";
  if (n >= low) return "text-amber-400";
  return "text-red-400";
}

function TemplateLink({ slug }: { slug: string }) {
  return (
    <a href={`https://convitede.com/convite/${slug}`} target="_blank" rel="noopener noreferrer">
      <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-indigo-400 shrink-0" title={`Ver convite: ${slug}`}>
        <IconExternalLink size={13} />
      </Button>
    </a>
  );
}

const SORT_OPTIONS: { key: TemplateOrderBy; label: string }[] = [
  { key: "revenue", label: "Receita" },
  { key: "payments", label: "Pagamentos" },
  { key: "edits", label: "Edições" },
  { key: "views", label: "Views" },
  { key: "edit_to_payment", label: "Conversão" },
  { key: "rpm", label: "RPM" },
];

interface TemplatesTableProps {
  data: ITemplateData[];
  pagination: IPaginationMeta;
  isLoading: boolean;
  orderBy: TemplateOrderBy;
  orderDir: OrderDirection;
  onOrderBy: (key: TemplateOrderBy) => void;
  onOrderDir: (dir: OrderDirection) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function TemplatesTable({
  data,
  pagination,
  isLoading,
  orderBy,
  orderDir,
  onOrderBy,
  onOrderDir,
  onPageChange,
  onPageSizeChange,
}: TemplatesTableProps) {
  const handleSort = (key: TemplateOrderBy) => {
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
    pageSizeOptions: [25, 50, 100],
  };

  const columns: TableColumn<ITemplateData>[] = [
    {
      key: "name",
      header: "Template",
      mobilePrimary: true,
      render: (t) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-zinc-200 truncate max-w-[200px] block">{t.name}</span>
          <TemplateLink slug={t.slug} />
        </div>
      ),
    },
    {
      key: "category",
      header: "Categoria",
      render: (t) => (
        <Badge variant="outline" className="border-indigo-600/30 bg-indigo-600/10 text-indigo-400 text-[10px] font-semibold">
          {t.category}
        </Badge>
      ),
    },
    {
      key: "views",
      header: "Views",
      align: "right",
      render: (t) => <span className="font-mono text-sm text-zinc-400">{Number(t.views).toLocaleString("pt-BR")}</span>,
    },
    {
      key: "edits",
      header: "Edições",
      align: "right",
      render: (t) => <span className="font-mono text-sm text-zinc-400">{t.edits}</span>,
    },
    {
      key: "payments",
      header: "Pagos",
      align: "right",
      render: (t) => <span className="font-mono text-sm font-semibold text-emerald-400">{t.payments}</span>,
    },
    {
      key: "revenue",
      header: "Receita",
      align: "right",
      render: (t) => <span className="font-mono text-sm font-bold text-emerald-400">R$ {Number(t.revenue).toFixed(0)}</span>,
    },
    {
      key: "view_to_edit",
      header: "View→Edit",
      align: "right",
      mobileHide: true,
      render: (t) => (
        <span className={cn("font-mono text-sm font-semibold", conversionColor(t.view_to_edit, 2.5, 4))}>
          {t.view_to_edit}%
        </span>
      ),
    },
    {
      key: "edit_to_payment",
      header: "Edit→Pago",
      align: "right",
      render: (t) => (
        <span className={cn("font-mono text-sm font-semibold", conversionColor(t.edit_to_payment, 25, 40))}>
          {t.edit_to_payment}%
        </span>
      ),
    },
    {
      key: "rpm",
      header: "RPM",
      align: "right",
      mobileHide: true,
      render: (t) => <span className="font-mono text-sm font-bold text-amber-400">R$ {t.rpm}</span>,
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      data={data}
      getRowKey={(t) => t.uuid}
      isLoading={isLoading}
      serverPagination={serverPagination}
      emptyMessage="Nenhum template encontrado no período"
      header={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Templates por Receita</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              RPM = receita por 1.000 views · <IconExternalLink size={10} className="inline mb-0.5" /> abre o convite
            </p>
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
