"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ILandingPageData,
  IStepMeta,
  OrderDirection,
  IPaginationMeta,
} from "@/interfaces/dashboard.interface";
import {
  ResponsiveTable,
  TableColumn,
  ServerPaginationConfig,
} from "@/components/ui/responsive-table";
import { IconChevronDown, IconChevronUp, IconCopy, IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { fmtInt, fmtCurrencyDecimal } from "@/utils/format";
import { useOrganization } from "@/components/providers/organization-provider";

function conversionColor(value: string) {
  const n = parseFloat(value);
  if (n >= 10) return "text-emerald-400";
  if (n >= 3) return "text-zinc-300";
  if (n >= 1) return "text-amber-400";
  return "text-red-500";
}

function heatmapStyle(
  value: number,
  max: number,
  type: "indigo" | "emerald"
): React.CSSProperties {
  if (max === 0 || value === 0) return {};
  const intensity = (value / max) * 0.2;
  const color =
    type === "emerald"
      ? `rgba(52,211,153,${intensity})`
      : `rgba(99,102,241,${intensity})`;
  return { background: color };
}

function UrlCell({ page }: { page: string }) {
  const t = useTranslations("pages.table");
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(page).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative flex items-center gap-1.5 max-w-[320px]">
      <span
        className="font-mono text-xs text-zinc-300 truncate flex-1 min-w-0"
        title={page}
      >
        {page}
      </span>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded text-zinc-600 hover:text-zinc-300"
        title={t("copyUrl")}
      >
        {copied ? (
          <IconCheck size={10} className="text-emerald-400" />
        ) : (
          <IconCopy size={10} />
        )}
      </button>
      <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 z-50 hidden group-hover:block">
        <div className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 shadow-xl max-w-xs">
          <p className="font-mono text-[10px] text-zinc-200 break-all leading-relaxed">
            {page}
          </p>
        </div>
      </div>
    </div>
  );
}

interface PagesTableProps {
  data: ILandingPageData[];
  stepMeta: IStepMeta[];
  pagination: IPaginationMeta;
  isLoading: boolean;
  orderBy: string;
  orderDir: OrderDirection;
  onOrderBy: (key: string) => void;
  onOrderDir: (dir: OrderDirection) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function PagesTable({
  data,
  stepMeta,
  pagination,
  isLoading,
  orderBy,
  orderDir,
  onOrderBy,
  onOrderDir,
  onPageChange,
  onPageSizeChange,
}: PagesTableProps) {
  const t = useTranslations("pages.table");
  const { organization } = useOrganization();
  const locale = organization?.locale ?? "pt-BR";
  const currency = organization?.currency ?? "BRL";

  const handleSort = (key: string) => {
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

  const stepMaxes: Record<string, number> = {};
  for (const step of stepMeta) {
    stepMaxes[step.key] = Math.max(...data.map((lp) => lp.steps[step.key] ?? 0), 0);
  }
  const maxRevenue = Math.max(...data.map((lp) => lp.revenue), 0);

  const fixedSortOptions = [
    { key: "revenue", label: t("columns.revenue") },
    { key: "conversion_rate", label: t("columns.conversion") },
  ];
  const stepSortOptions = stepMeta.map((s) => ({ key: s.key, label: s.label }));
  const allSortOptions = [...stepSortOptions, ...fixedSortOptions];

  const stepColumns: TableColumn<ILandingPageData>[] = stepMeta.map((step) => ({
    key: step.key,
    header: step.label,
    align: "right" as const,
    render: (lp: ILandingPageData) => {
      const val = lp.steps[step.key] ?? 0;
      return (
        <span
          className="font-mono text-sm text-zinc-400 px-1 rounded"
          style={heatmapStyle(val, stepMaxes[step.key] ?? 0, "indigo")}
        >
          {fmtInt(val)}
        </span>
      );
    },
  }));

  const columns: TableColumn<ILandingPageData>[] = [
    {
      key: "page",
      header: t("columns.page"),
      mobilePrimary: true,
      render: (lp) => <UrlCell page={lp.page} />,
    },
    ...stepColumns,
    {
      key: "conversion_rate",
      header: t("columns.conversion"),
      align: "right",
      render: (lp) => (
        <span
          className={cn(
            "font-mono text-sm font-semibold",
            conversionColor(String(lp.conversion_rate))
          )}
        >
          {lp.conversion_rate}
        </span>
      ),
    },
    {
      key: "revenue",
      header: t("columns.revenue"),
      align: "right",
      render: (lp) => (
        <span
          className="font-mono text-sm font-bold text-emerald-400 px-1 rounded"
          style={heatmapStyle(lp.revenue, maxRevenue, "emerald")}
        >
          {fmtCurrencyDecimal(lp.revenue / 100, locale, currency)}
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
      emptyMessage={t("emptyMessage")}
      header={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">
              {t("title")}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {allSortOptions.map((s) => {
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
                  {isActive &&
                    (orderDir === "DESC" ? (
                      <IconChevronDown size={10} />
                    ) : (
                      <IconChevronUp size={10} />
                    ))}
                </button>
              );
            })}
          </div>
        </div>
      }
    />
  );
}
