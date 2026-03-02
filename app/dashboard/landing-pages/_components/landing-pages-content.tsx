"use client";

import { useState, Suspense } from "react";
import { useLandingPages } from "@/hooks/queries/use-landing-pages";
import { useDebounce } from "@/hooks/use-debounce";
import { useOrganization } from "@/components/providers/organization-provider";
import { IDateFilter, ILandingPageParams, OrderDirection } from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/dashboard/_components/period-filter";
import { MetricFiltersPanel, MetricFilterField } from "@/components/ui/metric-filters";
import { LandingPagesTable } from "./landing-pages-table";
import { Input } from "@/components/ui/input";
import { IconSearch } from "@tabler/icons-react";

const EMPTY_PAGINATION = { page: 1, limit: 30, total: 0, total_pages: 0 };

const METRIC_FIELDS: MetricFilterField[] = [
  { key: "pageviews", label: "Pageviews" },
  { key: "payments", label: "Pagamentos" },
  { key: "revenue", label: "Receita", prefix: "R$" },
  { key: "conversion_rate", label: "Conversão", suffix: "%" },
];

interface LandingPagesContentProps {
  filter: IDateFilter;
}

export function LandingPagesContent({ filter }: LandingPagesContentProps) {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [orderBy, setOrderBy] = useState<NonNullable<ILandingPageParams["order_by"]>>("revenue");
  const [orderDir, setOrderDir] = useState<OrderDirection>("DESC");
  const [metricFilters, setMetricFilters] = useState<Record<string, string>>({});

  const params: ILandingPageParams = {
    ...filter,
    page,
    limit,
    order_by: orderBy,
    order_dir: orderDir,
    search: debouncedSearch || undefined,
    ...(metricFilters as Partial<ILandingPageParams>),
  };

  const { data: resp, isLoading } = useLandingPages(orgId, params);

  const landingPagesData = resp?.data ?? [];
  const pagination = resp?.pagination ?? EMPTY_PAGINATION;

  const handleMetricChange = (values: Record<string, string>) => {
    setMetricFilters(values);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Landing Pages</h1>
          <p className="text-xs text-zinc-500">Conversão e receita por página de entrada</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Buscar página..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-8 w-44 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-sm"
            />
          </div>
          <Suspense>
            <PeriodFilter filter={filter} />
          </Suspense>
        </div>
      </div>

      <MetricFiltersPanel
        fields={METRIC_FIELDS}
        values={metricFilters}
        onChange={handleMetricChange}
      />

      <LandingPagesTable
        data={landingPagesData}
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
