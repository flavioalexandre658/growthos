"use client";

import { useChannels } from "@/hooks/queries/use-channels";
import { DashboardPeriod } from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/dashboard/_components/period-filter";
import { ChannelsBarChart } from "./channels-bar-chart";
import { ChannelsTable } from "./channels-table";
import { Suspense } from "react";

interface ChannelsContentProps {
  period: DashboardPeriod;
}

export function ChannelsContent({ period }: ChannelsContentProps) {
  const { data, isLoading } = useChannels(period);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Canais de Aquisição</h1>
          <p className="text-xs text-zinc-500">
            Receita, conversão e ticket médio por canal
          </p>
        </div>
        <Suspense>
          <PeriodFilter period={period} />
        </Suspense>
      </div>

      <ChannelsBarChart data={data} isLoading={isLoading} />
      <ChannelsTable data={data} isLoading={isLoading} />
    </div>
  );
}
