"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  IChannelData,
  IStepMeta,
  OrderDirection,
  IPaginationMeta,
} from "@/interfaces/dashboard.interface";
import { ResponsiveTable, TableColumn, ServerPaginationConfig } from "@/components/ui/responsive-table";
import { IconChevronDown, IconChevronUp, IconEye, IconEyeOff } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { ChannelBadge } from "@/components/ui/channel-badge";
import { fmtInt, fmtCurrencyDecimal } from "@/utils/format";
import { useOrganization } from "@/components/providers/organization-provider";

function roiColor(roi: number) {
  if (roi >= 500) return "text-emerald-400";
  if (roi >= 100) return "text-zinc-300";
  if (roi >= 0) return "text-amber-400";
  return "text-red-400";
}

function conversionColor(value: string) {
  const n = parseFloat(value);
  if (n >= 10) return "text-emerald-400";
  if (n >= 3) return "text-zinc-300";
  if (n >= 1) return "text-amber-400";
  return "text-zinc-500";
}

function variationBadge(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const abs = Math.abs(pct).toFixed(0);
  if (Math.abs(pct) < 1) return <span className="text-[10px] font-mono text-zinc-600">—</span>;
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-400">
        ↑ {abs}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-red-400">
      ↓ {abs}%
    </span>
  );
}

function heatmapStyle(value: number, max: number, type: "indigo" | "emerald") {
  if (max === 0 || value === 0) return {};
  const intensity = (value / max) * 0.18;
  const color = type === "emerald" ? `rgba(52,211,153,${intensity})` : `rgba(99,102,241,${intensity})`;
  return { background: color };
}

type ChannelRow = IChannelData & { colorIndex: number };

interface ChannelsTableProps {
  data: IChannelData[];
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

function ExpandedChannelRow({ c, t, locale, currency }: { c: ChannelRow; t: ReturnType<typeof useTranslations<"channels.table">>; locale: string; currency: string }) {
  const hasInvestment = c.investment !== undefined && c.investment !== null;
  const hasLtv = c.avgLtv !== undefined && c.avgLtv > 0;
  const hasChurn = !!c.churnRate;
  const hasCustomers = c.customersCount !== undefined;
  const hasCac = c.cac != null;
  const hasPayback = c.paybackMonths != null;

  const churnN = hasChurn ? parseFloat(c.churnRate!) : 0;
  const churnColor = churnN >= 10 ? "text-red-400" : churnN >= 5 ? "text-amber-400" : churnN > 0 ? "text-zinc-300" : "text-emerald-400";
  const cacColor = hasCac && c.cac! > 50000 ? "text-red-400" : hasCac && c.cac! > 20000 ? "text-amber-400" : "text-zinc-300";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {hasInvestment && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{t("colInvestment")}</span>
          <span className="font-mono text-sm text-violet-400">{fmtCurrencyDecimal(c.investment! / 100, locale, currency)}</span>
        </div>
      )}
      {c.roi !== undefined && c.roi !== null && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{t("colRoi")}</span>
          <span className={cn("font-mono text-sm font-semibold", roiColor(c.roi))}>
            {c.roi >= 0 ? "+" : ""}{c.roi}%
          </span>
        </div>
      )}
      {hasCac && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{t("colCac")}</span>
          <span className={cn("font-mono text-sm font-semibold", cacColor)}>{fmtCurrencyDecimal(c.cac! / 100, locale, currency)}</span>
        </div>
      )}
      {hasPayback && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{t("colPayback")}</span>
          {c.paybackMonths === 0
            ? <span className="font-mono text-sm text-emerald-400">{t("instant")}</span>
            : <span className="font-mono text-sm text-zinc-300">{t("months", { value: c.paybackMonths ?? 0 })}</span>
          }
        </div>
      )}
      {hasCustomers && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{t("colCustomers")}</span>
          <span className="font-mono text-sm text-zinc-400">{fmtInt(c.customersCount!)}</span>
        </div>
      )}
      {hasLtv && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{t("colAvgLtv")}</span>
          <span className="font-mono text-sm text-emerald-400">{fmtCurrencyDecimal(c.avgLtv! / 100, locale, currency)}</span>
        </div>
      )}
      {hasChurn && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{t("colChurn")}</span>
          <span className={cn("font-mono text-sm font-semibold", churnColor)}>{c.churnRate}</span>
        </div>
      )}
      {c.ticket_medio > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{t("colAvgTicket")}</span>
          <span className="font-mono text-sm text-zinc-300">{fmtCurrencyDecimal(c.ticket_medio / 100, locale, currency)}</span>
        </div>
      )}
    </div>
  );
}

export function ChannelsTable({
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
}: ChannelsTableProps) {
  const t = useTranslations("channels.table");
  const { organization } = useOrganization();
  const locale = organization?.locale ?? "pt-BR";
  const currency = organization?.currency ?? "BRL";
  const [showNoRevenue, setShowNoRevenue] = useState(false);

  const withRevenue = data.filter((c) => c.revenue > 0);
  const noRevenue = data.filter((c) => c.revenue === 0);

  const visibleRows: ChannelRow[] = (showNoRevenue ? data : withRevenue).map((c, i) => ({
    ...c,
    colorIndex: i,
  }));

  const maxRevenue = Math.max(...data.map((c) => c.revenue), 0);
  const stepMaxes: Record<string, number> = {};
  for (const step of stepMeta) {
    stepMaxes[step.key] = Math.max(...data.map((c) => c.steps[step.key] ?? 0), 0);
  }

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
    pageSizeOptions: [10, 30, 50],
  };

  const sortOptions: { key: string; label: string }[] = [
    { key: "revenue", label: t("sortRevenue") },
    { key: "conversion_rate", label: t("sortConversion") },
    { key: "customersCount", label: t("sortCustomers") },
    { key: "avgLtv", label: t("sortLtv") },
    { key: "churnRate", label: t("sortChurn") },
    { key: "ticket_medio", label: t("sortTicket") },
    ...stepMeta.map((s) => ({ key: s.key, label: s.label })),
  ];

  const stepColumns: TableColumn<ChannelRow>[] = stepMeta.map((step) => ({
    key: step.key,
    header: step.label,
    align: "right" as const,
    render: (c: ChannelRow) => {
      const val = c.steps[step.key] ?? 0;
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

  const columns: TableColumn<ChannelRow>[] = [
    {
      key: "channel",
      header: t("colChannel"),
      mobilePrimary: true,
      render: (c) => (
        <div className="flex items-center gap-1">
          <ChannelBadge channel={c.channel} size="sm" linkToChannel={false} />
          {!c.revenue && (
            <span className="text-[10px] text-zinc-600 ml-1">{t("noRevenue")}</span>
          )}
        </div>
      ),
    },
    ...stepColumns,
    {
      key: "conversion_rate",
      header: t("colConversion"),
      align: "right",
      render: (c) => (
        <span className={cn("font-mono text-sm font-semibold", conversionColor(String(c.conversion_rate)))}>
          {c.conversion_rate}
        </span>
      ),
    },
    {
      key: "revenue",
      header: t("colRevenue"),
      align: "right",
      render: (c) => (
        <div className="flex flex-col items-end gap-0.5">
          <span
            className="font-mono text-sm font-bold text-emerald-400 px-1 rounded"
            style={heatmapStyle(c.revenue, maxRevenue, "emerald")}
          >
            {fmtCurrencyDecimal(c.revenue / 100, locale, currency)}
          </span>
          {variationBadge(c.revenue, c.previousRevenue)}
        </div>
      ),
    },
  ];

  const tableHeader = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          {t("subtitle", { withRevenue: withRevenue.length, noRevenue: noRevenue.length })}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 shrink-0 items-center">
        {noRevenue.length > 0 && (
          <button
            onClick={() => setShowNoRevenue((v) => !v)}
            className={cn(
              "flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors",
              showNoRevenue
                ? "border-zinc-600 bg-zinc-800 text-zinc-300"
                : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
            )}
          >
            {showNoRevenue ? <IconEyeOff size={10} /> : <IconEye size={10} />}
            {showNoRevenue ? t("hide") : t("showNoRevenue", { count: noRevenue.length })}
          </button>
        )}
        {sortOptions.map((s) => {
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
  );

  return (
    <ResponsiveTable
      columns={columns}
      data={visibleRows}
      getRowKey={(c) => c.channel}
      isLoading={isLoading}
      serverPagination={serverPagination}
      emptyMessage={t("emptyState")}
      header={tableHeader}
      expandedRowRender={(c) => <ExpandedChannelRow c={c} t={t} locale={locale} currency={currency} />}
    />
  );
}
