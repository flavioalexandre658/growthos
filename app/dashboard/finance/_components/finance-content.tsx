"use client";

import { useFunnel } from "@/hooks/queries/use-funnel";
import { useDaily } from "@/hooks/queries/use-daily";
import { useCategories } from "@/hooks/queries/use-categories";
import { DashboardPeriod } from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/dashboard/_components/period-filter";
import { FinanceKpiCards } from "./finance-kpi-cards";
import { RevenueLineChart } from "./revenue-line-chart";
import { CategoriesTable } from "./categories-table";
import { Suspense } from "react";

interface FinanceContentProps {
  period: DashboardPeriod;
}

export function FinanceContent({ period }: FinanceContentProps) {
  const { data: funnel, isLoading: funnelLoading } = useFunnel(period);
  const { data: daily, isLoading: dailyLoading } = useDaily(period);
  const { data: categories, isLoading: categoriesLoading } = useCategories(period);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Financeiro</h1>
          <p className="text-xs text-zinc-500">
            Receita bruta, líquida, margem e ticket médio
          </p>
        </div>
        <Suspense>
          <PeriodFilter period={period} />
        </Suspense>
      </div>

      <FinanceKpiCards data={funnel} isLoading={funnelLoading} />
      <RevenueLineChart data={daily} isLoading={dailyLoading} />
      <CategoriesTable data={categories} isLoading={categoriesLoading} />
    </div>
  );
}
