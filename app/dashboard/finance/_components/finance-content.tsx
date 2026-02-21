"use client";

import { useState, Suspense } from "react";
import { useCategories } from "@/hooks/queries/use-categories";
import { IDateFilter, ICategoryParams, OrderDirection } from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/dashboard/_components/period-filter";
import { CategoriesTable } from "./categories-table";

const EMPTY_PAGINATION = { page: 1, limit: 50, total: 0, total_pages: 0 };

interface FinanceContentProps {
  filter: IDateFilter;
}

export function FinanceContent({ filter }: FinanceContentProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [orderBy, setOrderBy] = useState<NonNullable<ICategoryParams["order_by"]>>("revenue");
  const [orderDir, setOrderDir] = useState<OrderDirection>("DESC");

  const params: ICategoryParams = { ...filter, page, limit, order_by: orderBy, order_dir: orderDir };
  const { data: resp, isLoading } = useCategories(params);

  const categoriesData = resp?.data ?? [];
  const pagination = resp?.pagination ?? EMPTY_PAGINATION;

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
