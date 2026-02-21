"use client";

import { useState, useMemo } from "react";
import { ITemplateData } from "@/interfaces/dashboard.interface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveTable,
  TableColumn,
} from "@/components/ui/responsive-table";
import {
  IconChevronUp,
  IconChevronDown,
  IconSelector,
  IconExternalLink,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type SortKey = "revenue" | "payments" | "edits" | "views" | "edit_to_payment" | "rpm";

function conversionColor(value: string, low: number, mid: number) {
  const n = parseFloat(value);
  if (n >= mid) return "text-emerald-400";
  if (n >= low) return "text-amber-400";
  return "text-red-400";
}

function TemplateLink({ slug }: { slug: string }) {
  return (
    <a
      href={`https://convitede.com/convite/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-zinc-500 hover:text-indigo-400 shrink-0"
        title={`Ver convite: ${slug}`}
      >
        <IconExternalLink size={13} />
      </Button>
    </a>
  );
}

interface SortButtonProps {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  direction: "asc" | "desc";
  onSort: (key: SortKey) => void;
}

function SortButton({ label, sortKey, currentSort, direction, onSort }: SortButtonProps) {
  const isActive = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors w-full justify-end"
    >
      {label}
      {isActive ? (
        direction === "desc" ? <IconChevronDown size={11} /> : <IconChevronUp size={11} />
      ) : (
        <IconSelector size={11} className="opacity-40" />
      )}
    </button>
  );
}

interface TemplatesTableProps {
  data: ITemplateData[] | undefined;
  isLoading: boolean;
}

export function TemplatesTable({ data, isLoading }: TemplatesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setDirection("desc");
    }
  };

  const sorted = useMemo(
    () =>
      [...(data ?? [])].sort((a, b) => {
        const av = parseFloat(String(a[sortKey]));
        const bv = parseFloat(String(b[sortKey]));
        return direction === "desc" ? bv - av : av - bv;
      }),
    [data, sortKey, direction]
  );

  const columns: TableColumn<ITemplateData>[] = [
    {
      key: "name",
      header: "Template",
      mobilePrimary: true,
      render: (t) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-zinc-200 truncate max-w-[200px] block">
            {t.name}
          </span>
          <TemplateLink slug={t.slug} />
        </div>
      ),
    },
    {
      key: "category",
      header: "Categoria",
      render: (t) => (
        <Badge
          variant="outline"
          className="border-indigo-600/30 bg-indigo-600/10 text-indigo-400 text-[10px] font-semibold"
        >
          {t.category}
        </Badge>
      ),
    },
    {
      key: "views",
      header: "Views",
      align: "right",
      render: (t) => (
        <span className="font-mono text-sm text-zinc-400">
          {Number(t.views).toLocaleString("pt-BR")}
        </span>
      ),
    },
    {
      key: "edits",
      header: "Edições",
      align: "right",
      render: (t) => (
        <span className="font-mono text-sm text-zinc-400">{t.edits}</span>
      ),
    },
    {
      key: "payments",
      header: "Pagos",
      align: "right",
      render: (t) => (
        <span className="font-mono text-sm font-semibold text-emerald-400">
          {t.payments}
        </span>
      ),
    },
    {
      key: "revenue",
      header: "Receita",
      align: "right",
      render: (t) => (
        <span className="font-mono text-sm font-bold text-emerald-400">
          R$ {Number(t.revenue).toFixed(0)}
        </span>
      ),
    },
    {
      key: "view_to_edit",
      header: "View→Edit",
      align: "right",
      mobileHide: true,
      render: (t) => (
        <span
          className={cn(
            "font-mono text-sm font-semibold",
            conversionColor(t.view_to_edit, 2.5, 4)
          )}
        >
          {t.view_to_edit}%
        </span>
      ),
    },
    {
      key: "edit_to_payment",
      header: "Edit→Pago",
      align: "right",
      render: (t) => (
        <span
          className={cn(
            "font-mono text-sm font-semibold",
            conversionColor(t.edit_to_payment, 25, 40)
          )}
        >
          {t.edit_to_payment}%
        </span>
      ),
    },
    {
      key: "rpm",
      header: "RPM",
      align: "right",
      mobileHide: true,
      render: (t) => (
        <span className="font-mono text-sm font-bold text-amber-400">
          R$ {t.rpm}
        </span>
      ),
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      data={sorted}
      getRowKey={(t) => t.uuid}
      isLoading={isLoading}
      initialPageSize={25}
      emptyMessage="Nenhum template encontrado no período"
      header={
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">
              Templates por Receita
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              RPM = receita por 1.000 views ·{" "}
              <span className="inline-flex items-center gap-1">
                clique em <IconExternalLink size={10} className="inline" /> para
                ver o convite
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {(
              [
                { key: "revenue", label: "Receita" },
                { key: "payments", label: "Pagamentos" },
                { key: "edit_to_payment", label: "Conversão" },
                { key: "rpm", label: "RPM" },
              ] as { key: SortKey; label: string }[]
            ).map((s) => (
              <button
                key={s.key}
                onClick={() => handleSort(s.key)}
                className={cn(
                  "text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors",
                  sortKey === s.key
                    ? "border-indigo-600/50 bg-indigo-600/20 text-indigo-400"
                    : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                )}
              >
                {s.label}{" "}
                {sortKey === s.key &&
                  (direction === "desc" ? "↓" : "↑")}
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
}
