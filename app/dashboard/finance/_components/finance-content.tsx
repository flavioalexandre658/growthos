"use client";

import { useState, Suspense } from "react";
import { useFunnel } from "@/hooks/queries/use-funnel";
import { useDaily } from "@/hooks/queries/use-daily";
import { useCategories } from "@/hooks/queries/use-categories";
import {
  DashboardPeriod,
  ICategoryParams,
  OrderDirection,
} from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/dashboard/_components/period-filter";
import { FinanceKpiCards } from "./finance-kpi-cards";
import { RevenueLineChart } from "./revenue-line-chart";
import { CategoriesTable } from "./categories-table";

const EMPTY_PAGINATION = { page: 1, limit: 25, total: 0, total_pages: 0 };

interface FinanceContentProps {
  period: DashboardPeriod;
}

export function FinanceContent({ period }: FinanceContentProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [orderBy, setOrderBy] = useState<NonNullable<ICategoryParams["order_by"]>>("revenue");
  const [orderDir, setOrderDir] = useState<OrderDirection>("DESC");

  const { data: funnel, isLoading: funnelLoading } = useFunnel(period);
  const { data: daily, isLoading: dailyLoading } = useDaily(period);

  const categoryParams: ICategoryParams = { period, page, limit, order_by: orderBy, order_dir: orderDir };
  const { data: categoriesResp, isLoading: categoriesLoading } = useCategories(categoryParams);

  const categoriesData = categoriesResp?.data ?? [];
  const categoriesPagination = categoriesResp?.pagination ?? EMPTY_PAGINATION;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Financeiro</h1>
          <p className="text-xs text-zinc-500">Receita bruta, líquida, margem e ticket médio</p>
        </div>
        <Suspense>
          <PeriodFilter period={period} />
        </Suspense>
      </div>

      <FinanceKpiCards data={funnel} isLoading={funnelLoading} />
      <RevenueLineChart data={daily} isLoading={dailyLoading} />
      <CategoriesTable
        data={categoriesData}
        pagination={categoriesPagination}
        isLoading={categoriesLoading}
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
