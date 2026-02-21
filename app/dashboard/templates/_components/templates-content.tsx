"use client";

import { useTemplates } from "@/hooks/queries/use-templates";
import { DashboardPeriod } from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/dashboard/_components/period-filter";
import { TemplatesTable } from "./templates-table";
import { OpportunitiesSection } from "./opportunities-section";
import { Suspense } from "react";

interface TemplatesContentProps {
  period: DashboardPeriod;
}

export function TemplatesContent({ period }: TemplatesContentProps) {
  const { data, isLoading } = useTemplates(period);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Templates</h1>
          <p className="text-xs text-zinc-500">
            Performance por template — conversão e receita
          </p>
        </div>
        <Suspense>
          <PeriodFilter period={period} />
        </Suspense>
      </div>

      <TemplatesTable data={data} isLoading={isLoading} />
      <OpportunitiesSection data={data} isLoading={isLoading} />
    </div>
  );
}
