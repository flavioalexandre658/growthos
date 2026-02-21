"use client";

import { useState, Suspense } from "react";
import { useLandingPages } from "@/hooks/queries/use-landing-pages";
import { useDebounce } from "@/hooks/use-debounce";
import {
  DashboardPeriod,
  ILandingPageParams,
  OrderDirection,
} from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/dashboard/_components/period-filter";
import { Input } from "@/components/ui/input";
import { LandingPagesTable } from "./landing-pages-table";
import { IconSearch } from "@tabler/icons-react";

const EMPTY_PAGINATION = { page: 1, limit: 30, total: 0, total_pages: 0 };

interface LandingPagesContentProps {
  period: DashboardPeriod;
}

export function LandingPagesContent({ period }: LandingPagesContentProps) {
  const [urlSearch, setUrlSearch] = useState("");
  const debouncedSearch = useDebounce(urlSearch, 400);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [orderBy, setOrderBy] = useState<NonNullable<ILandingPageParams["order_by"]>>("revenue");
  const [orderDir, setOrderDir] = useState<OrderDirection>("DESC");

  const params: ILandingPageParams = {
    period,
    page,
    limit,
    order_by: orderBy,
    order_dir: orderDir,
    search: debouncedSearch || undefined,
  };

  const { data: resp, isLoading } = useLandingPages(params);

  const landingData = resp?.data ?? [];
  const pagination = resp?.pagination ?? EMPTY_PAGINATION;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Landing Pages</h1>
          <p className="text-xs text-zinc-500">
            Páginas de entrada com mais conversão e receita — requer attribution ativo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Buscar URL..."
              value={urlSearch}
              onChange={(e) => {
                setUrlSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-8 w-48 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-sm"
            />
          </div>
          <Suspense>
            <PeriodFilter period={period} />
          </Suspense>
        </div>
      </div>

      <LandingPagesTable
        data={landingData}
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
