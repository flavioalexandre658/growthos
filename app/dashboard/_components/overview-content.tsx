"use client";

import { Suspense } from "react";
import { useFunnel } from "@/hooks/queries/use-funnel";
import { useDaily } from "@/hooks/queries/use-daily";
import { useOrganization } from "@/components/providers/organization-provider";
import { IDateFilter } from "@/interfaces/dashboard.interface";
import { KpiCards } from "./kpi-cards";
import { FunnelSection } from "./funnel-section";
import { DailyChart } from "./daily-chart";
import { PeriodFilter } from "./period-filter";

interface OverviewContentProps {
  filter: IDateFilter;
}

export function OverviewContent({ filter }: OverviewContentProps) {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: funnel, isLoading: funnelLoading } = useFunnel(orgId, filter);
  const { data: daily, isLoading: dailyLoading } = useDaily(orgId, filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Visão Geral</h1>
          <p className="text-xs text-zinc-500">Performance consolidada do período</p>
        </div>
        <Suspense>
          <PeriodFilter filter={filter} />
        </Suspense>
      </div>

      <KpiCards data={funnel} isLoading={funnelLoading} />
      <FunnelSection data={funnel} isLoading={funnelLoading} />
      <DailyChart data={daily} isLoading={dailyLoading} />
    </div>
  );
}
