"use client";

import { useFunnel } from "@/hooks/queries/use-funnel";
import { useDaily } from "@/hooks/queries/use-daily";
import { DashboardPeriod } from "@/interfaces/dashboard.interface";
import { KpiCards } from "./kpi-cards";
import { FunnelSection } from "./funnel-section";
import { DailyChart } from "./daily-chart";
import { PeriodFilter } from "./period-filter";
import { Suspense } from "react";

interface OverviewContentProps {
  period: DashboardPeriod;
}

export function OverviewContent({ period }: OverviewContentProps) {
  const { data: funnel, isLoading: funnelLoading } = useFunnel(period);
  const { data: daily, isLoading: dailyLoading } = useDaily(period);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Visão Geral</h1>
          <p className="text-xs text-zinc-500">Performance consolidada do período</p>
        </div>
        <Suspense>
          <PeriodFilter period={period} />
        </Suspense>
      </div>

      <KpiCards data={funnel} isLoading={funnelLoading} />
      <FunnelSection data={funnel} isLoading={funnelLoading} />
      <DailyChart data={daily} isLoading={dailyLoading} />
    </div>
  );
}
