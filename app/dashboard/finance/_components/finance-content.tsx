"use client";

import { useState, Suspense } from "react";
import { useCategories } from "@/hooks/queries/use-categories";
import { useFunnel } from "@/hooks/queries/use-funnel";
import { useDaily } from "@/hooks/queries/use-daily";
import { IDateFilter, ICategoryParams, OrderDirection } from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/dashboard/_components/period-filter";
import { MetricFiltersPanel, MetricFilterField } from "@/components/ui/metric-filters";
import { CategoriesTable } from "./categories-table";
import { FinanceKpiCards } from "./finance-kpi-cards";
import { RevenueLineChart } from "./revenue-line-chart";

const EMPTY_PAGINATION = { page: 1, limit: 50, total: 0, total_pages: 0 };

const METRIC_FIELDS: MetricFilterField[] = [
  { key: "edits", label: "Edições" },
  { key: "payments", label: "Pagamentos" },
  { key: "revenue", label: "Receita", prefix: "R$" },
  { key: "net_revenue", label: "Rec. Líq.", prefix: "R$" },
  { key: "conversion_rate", label: "Conversão", suffix: "%" },
  { key: "ticket_medio", label: "Ticket Médio", prefix: "R$" },
];

interface FinanceContentProps {
  filter: IDateFilter;
}

export function FinanceContent({ filter }: FinanceContentProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [orderBy, setOrderBy] = useState<NonNullable<ICategoryParams["order_by"]>>("revenue");
  const [orderDir, setOrderDir] = useState<OrderDirection>("DESC");
  const [metricFilters, setMetricFilters] = useState<Record<string, string>>({});

  const params: ICategoryParams = {
    ...filter,
    page,
    limit,
    order_by: orderBy,
    order_dir: orderDir,
    ...(metricFilters as Partial<ICategoryParams>),
  };

  const { data: resp, isLoading } = useCategories(params);
  const { data: funnel, isLoading: funnelLoading } = useFunnel(filter);
  const { data: daily, isLoading: dailyLoading } = useDaily(filter);

  const categoriesData = resp?.data ?? [];
  const pagination = resp?.pagination ?? EMPTY_PAGINATION;

  const handleMetricChange = (values: Record<string, string>) => {
    setMetricFilters(values);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Financeiro</h1>
          <p className="text-xs text-zinc-500">Receita bruta, líquida, margem e ticket médio por categoria</p>
        </div>
        <Suspense>
          <PeriodFilter filter={filter} />
        </Suspense>
      </div>

      <FinanceKpiCards data={funnel} isLoading={funnelLoading} />
      <RevenueLineChart data={daily} isLoading={dailyLoading} />

      <MetricFiltersPanel
        fields={METRIC_FIELDS}
        values={metricFilters}
        onChange={handleMetricChange}
      />

      <CategoriesTable
        data={categoriesData}
        pagination={pagination}
        isLoading={isLoading}
        orderBy={orderBy}
        orderDir={orderDir}
        onOrderBy={(k) => { setOrderBy(k); setPage(1); }}
        onOrderDir={setOrderDir}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />
    </div>
  );
}
