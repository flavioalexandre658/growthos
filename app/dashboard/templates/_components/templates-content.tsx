"use client";

import { useState, Suspense } from "react";
import { useTemplates } from "@/hooks/queries/use-templates";
import { useTemplatesOpportunities } from "@/hooks/queries/use-templates-opportunities";
import { useDebounce } from "@/hooks/use-debounce";
import { IDateFilter, ITemplateParams, IOpportunityParams, OrderDirection } from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/dashboard/_components/period-filter";
import { MetricFiltersPanel, MetricFilterField } from "@/components/ui/metric-filters";
import { Input } from "@/components/ui/input";
import { TemplatesTable } from "./templates-table";
import { OpportunitiesSection } from "./opportunities-section";
import { IconSearch } from "@tabler/icons-react";

const EMPTY_PAGINATION = { page: 1, limit: 25, total: 0, total_pages: 0 };
const EMPTY_OPP_PAGINATION = { page: 1, limit: 20, total: 0, total_pages: 0 };

const METRIC_FIELDS: MetricFilterField[] = [
  { key: "views", label: "Views" },
  { key: "edits", label: "Edições" },
  { key: "payments", label: "Pagamentos" },
  { key: "revenue", label: "Receita", prefix: "R$" },
  { key: "net_revenue", label: "Rec. Líq.", prefix: "R$" },
  { key: "edit_to_payment", label: "Edit→Pago", suffix: "%" },
  { key: "view_to_edit", label: "View→Edit", suffix: "%" },
  { key: "view_to_payment", label: "View→Pago", suffix: "%" },
  { key: "rpm", label: "RPM", prefix: "R$" },
];

interface TemplatesContentProps {
  filter: IDateFilter;
}

export function TemplatesContent({ filter }: TemplatesContentProps) {
  const [nameSearch, setNameSearch] = useState("");
  const debouncedName = useDebounce(nameSearch, 400);
  const [metricFilters, setMetricFilters] = useState<Record<string, string>>({});

  const [tPage, setTPage] = useState(1);
  const [tLimit, setTLimit] = useState(25);
  const [tOrderBy, setTOrderBy] = useState<NonNullable<ITemplateParams["order_by"]>>("revenue");
  const [tOrderDir, setTOrderDir] = useState<OrderDirection>("DESC");

  const [oPage, setOPage] = useState(1);
  const [oLimit, setOLimit] = useState(20);
  const [oOrderBy, setOOrderBy] = useState<NonNullable<IOpportunityParams["order_by"]>>("edits");
  const [oOrderDir, setOOrderDir] = useState<OrderDirection>("DESC");

  const templateParams: ITemplateParams = {
    ...filter,
    page: tPage,
    limit: tLimit,
    order_by: tOrderBy,
    order_dir: tOrderDir,
    name: debouncedName || undefined,
    ...(metricFilters as Partial<ITemplateParams>),
  };

  const opportunityParams: IOpportunityParams = {
    ...filter,
    page: oPage,
    limit: oLimit,
    order_by: oOrderBy,
    order_dir: oOrderDir,
    name: debouncedName || undefined,
    ...(metricFilters as Partial<IOpportunityParams>),
  };

  const { data: templatesResp, isLoading: tLoading } = useTemplates(templateParams);
  const { data: oppResp, isLoading: oLoading } = useTemplatesOpportunities(opportunityParams);

  const templatesData = templatesResp?.data ?? [];
  const templatesPagination = templatesResp?.pagination ?? EMPTY_PAGINATION;
  const oppData = oppResp?.data ?? [];
  const oppPagination = oppResp?.pagination ?? EMPTY_OPP_PAGINATION;

  const handleMetricChange = (values: Record<string, string>) => {
    setMetricFilters(values);
    setTPage(1);
    setOPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Templates</h1>
          <p className="text-xs text-zinc-500">Performance por template — conversão e receita</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Buscar template..."
              value={nameSearch}
              onChange={(e) => { setNameSearch(e.target.value); setTPage(1); setOPage(1); }}
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

      <TemplatesTable
        data={templatesData}
        pagination={templatesPagination}
        isLoading={tLoading}
        orderBy={tOrderBy}
        orderDir={tOrderDir}
        onOrderBy={(k) => { setTOrderBy(k); setTPage(1); }}
        onOrderDir={setTOrderDir}
        onPageChange={setTPage}
        onPageSizeChange={(s) => { setTLimit(s); setTPage(1); }}
      />

      <OpportunitiesSection
        data={oppData}
        pagination={oppPagination}
        isLoading={oLoading}
        orderBy={oOrderBy}
        orderDir={oOrderDir}
        onOrderBy={(k) => { setOOrderBy(k); setOPage(1); }}
        onOrderDir={setOOrderDir}
        onPageChange={setOPage}
        onPageSizeChange={(s) => { setOLimit(s); setOPage(1); }}
      />
    </div>
  );
}
