"use client";

import { ICategoryData } from "@/interfaces/dashboard.interface";
import { ResponsiveTable, TableColumn } from "@/components/ui/responsive-table";
import { cn } from "@/lib/utils";

function conversionColor(value: string) {
  const n = parseFloat(value);
  if (n >= 35) return "text-emerald-400";
  if (n >= 20) return "text-amber-400";
  return "text-red-400";
}

interface CategoriesTableProps {
  data: ICategoryData[] | undefined;
  isLoading: boolean;
}

export function CategoriesTable({ data, isLoading }: CategoriesTableProps) {
  const sorted = [...(data ?? [])].sort((a, b) => b.revenue - a.revenue);

  const columns: TableColumn<ICategoryData>[] = [
    {
      key: "name",
      header: "Categoria",
      mobilePrimary: true,
      render: (c) => (
        <span className="font-semibold text-sm text-zinc-200">{c.name}</span>
      ),
    },
    {
      key: "edits",
      header: "Edições",
      align: "right",
      render: (c) => (
        <span className="font-mono text-sm text-zinc-400">{c.edits}</span>
      ),
    },
    {
      key: "payments",
      header: "Pagos",
      align: "right",
      render: (c) => (
        <span className="font-mono text-sm font-semibold text-emerald-400">
          {c.payments}
        </span>
      ),
    },
    {
      key: "conversion_rate",
      header: "Conversão",
      align: "right",
      render: (c) => (
        <span
          className={cn(
            "font-mono text-sm font-semibold",
            conversionColor(String(c.conversion_rate))
          )}
        >
          {c.conversion_rate}%
        </span>
      ),
    },
    {
      key: "revenue",
      header: "Receita Bruta",
      align: "right",
      render: (c) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          R$ {Number(c.revenue).toFixed(0)}
        </span>
      ),
    },
    {
      key: "net_revenue",
      header: "Receita Líq.",
      align: "right",
      render: (c) => (
        <span className="font-mono text-sm text-cyan-400">
          R$ {Number(c.net_revenue).toFixed(0)}
        </span>
      ),
    },
    {
      key: "ticket_medio",
      header: "Ticket",
      align: "right",
      render: (c) => (
        <span className="font-mono text-sm text-zinc-300">
          R$ {Number(c.ticket_medio).toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      data={sorted}
      getRowKey={(c) => c.uuid}
      isLoading={isLoading}
      initialPageSize={10}
      emptyMessage="Nenhuma categoria encontrada no período"
      header={
        <div>
          <h3 className="text-sm font-bold text-zinc-100">
            Receita por Categoria
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Performance financeira por categoria de convite
          </p>
        </div>
      }
    />
  );
}
