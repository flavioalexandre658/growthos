"use client";

import { IOpportunityData, IOpportunityParams, OrderDirection, IPaginationMeta } from "@/interfaces/dashboard.interface";
import { Button } from "@/components/ui/button";
import { ResponsiveTable, TableColumn, ServerPaginationConfig } from "@/components/ui/responsive-table";
import { IconAlertTriangle, IconExternalLink, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type OpportunityOrderBy = NonNullable<IOpportunityParams["order_by"]>;

const SORT_OPTIONS: { key: OpportunityOrderBy; label: string }[] = [
  { key: "edits", label: "Edições" },
  { key: "views", label: "Views" },
  { key: "edit_to_payment", label: "Conversão" },
  { key: "payments", label: "Pagamentos" },
];

function TemplateLink({ slug, name }: { slug: string; name: string }) {
  return (
    <a href={`https://convitede.com/convite/${slug}`} target="_blank" rel="noopener noreferrer">
      <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-indigo-400 shrink-0" title={`Ver convite: ${name}`}>
        <IconExternalLink size={13} />
      </Button>
    </a>
  );
}

interface OpportunitiesSectionProps {
  data: IOpportunityData[];
  pagination: IPaginationMeta;
  isLoading: boolean;
  orderBy: OpportunityOrderBy;
  orderDir: OrderDirection;
  onOrderBy: (key: OpportunityOrderBy) => void;
  onOrderDir: (dir: OrderDirection) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function OpportunitiesSection({
  data,
  pagination,
  isLoading,
  orderBy,
  orderDir,
  onOrderBy,
  onOrderDir,
  onPageChange,
  onPageSizeChange,
}: OpportunitiesSectionProps) {
  const handleSort = (key: OpportunityOrderBy) => {
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
    pageSizeOptions: [10, 20, 50],
  };

  const columns: TableColumn<IOpportunityData>[] = [
    {
      key: "name",
      header: "Template",
      mobilePrimary: true,
      render: (t) => (
        <div className="flex items-center gap-1.5">
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-zinc-200">{t.name}</span>
              <TemplateLink slug={t.slug} name={t.name} />
            </div>
            <span className="text-xs text-zinc-500">
              {Number(t.views).toLocaleString("pt-BR")} views
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "edits",
      header: "Edições",
      align: "right",
      render: (t) => <span className="font-mono text-sm text-zinc-400">{t.edits}</span>,
    },
    {
      key: "payments",
      header: "Pagamentos",
      align: "right",
      render: (t) => <span className="font-mono text-sm text-zinc-400">{t.payments}</span>,
    },
    {
      key: "edit_to_payment_rate",
      header: "Edit→Pago",
      align: "right",
      render: (t) => (
        <span className="font-mono text-sm font-bold text-red-400">{t.edit_to_payment_rate}%</span>
      ),
    },
    {
      key: "price",
      header: "Preço",
      align: "right",
      mobileHide: true,
      render: (t) => <span className="font-mono text-sm text-zinc-400">R$ {Number(t.price).toFixed(2)}</span>,
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      data={data}
      getRowKey={(t) => t.uuid}
      isLoading={isLoading}
      serverPagination={serverPagination}
      emptyMessage="Nenhum template nessa condição — ótimo sinal!"
      header={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <IconAlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-300">
                Oportunidades: Muito Editados, Pouco Convertidos
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                Templates com conversão Edit→Pago abaixo de 30%
              </p>
            </div>
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
                      ? "border-red-600/50 bg-red-600/10 text-red-400"
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
