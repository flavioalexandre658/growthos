"use client";

import { Suspense } from "react";
import { useFinancial } from "@/hooks/queries/use-financial";
import { useDaily } from "@/hooks/queries/use-daily";
import { useOrganization } from "@/components/providers/organization-provider";
import { IDateFilter } from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/dashboard/_components/period-filter";
import { FinanceKpiCards } from "./finance-kpi-cards";
import { RevenueLineChart } from "./revenue-line-chart";
import { FinanceBreakdownTable } from "./finance-breakdown-table";

interface FinanceContentProps {
  filter: IDateFilter;
}

export function FinanceContent({ filter }: FinanceContentProps) {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: financial, isLoading: financialLoading } = useFinancial(orgId, filter);
  const { data: daily, isLoading: dailyLoading } = useDaily(orgId, filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Financeiro</h1>
          <p className="text-xs text-zinc-500">Receita bruta, líquida, taxas e ticket médio</p>
        </div>
        <Suspense>
          <PeriodFilter filter={filter} />
        </Suspense>
      </div>

      <FinanceKpiCards data={financial} isLoading={financialLoading} />
      <RevenueLineChart data={daily} isLoading={dailyLoading} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <FinanceBreakdownTable
          title="Receita por Método de Pagamento"
          subtitle="Distribuição do faturamento por forma de pagamento"
          rows={financial?.byPaymentMethod.map((r) => ({ name: r.method, payments: r.payments, revenue: r.revenue, percentage: r.percentage })) ?? []}
          isLoading={financialLoading}
        />
        <FinanceBreakdownTable
          title="Receita por Categoria"
          subtitle="Distribuição do faturamento por categoria de produto"
          rows={financial?.byCategory.map((r) => ({ name: r.category, payments: r.payments, revenue: r.revenue, percentage: r.percentage })) ?? []}
          isLoading={financialLoading}
        />
      </div>
    </div>
  );
}
