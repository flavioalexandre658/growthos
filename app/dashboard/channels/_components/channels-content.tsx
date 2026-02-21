"use client";

import { useState, Suspense } from "react";
import { useChannels } from "@/hooks/queries/use-channels";
import {
  DashboardPeriod,
  IChannelParams,
  OrderDirection,
} from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/dashboard/_components/period-filter";
import { ChannelsBarChart } from "./channels-bar-chart";
import { ChannelsTable } from "./channels-table";

const EMPTY_PAGINATION = { page: 1, limit: 30, total: 0, total_pages: 0 };

interface ChannelsContentProps {
  period: DashboardPeriod;
}

export function ChannelsContent({ period }: ChannelsContentProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [orderBy, setOrderBy] = useState<NonNullable<IChannelParams["order_by"]>>("revenue");
  const [orderDir, setOrderDir] = useState<OrderDirection>("DESC");

  const params: IChannelParams = { period, page, limit, order_by: orderBy, order_dir: orderDir };
  const { data: resp, isLoading } = useChannels(params);

  const channelsData = resp?.data ?? [];
  const pagination = resp?.pagination ?? EMPTY_PAGINATION;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Canais de Aquisição</h1>
          <p className="text-xs text-zinc-500">Receita, conversão e ticket médio por canal</p>
        </div>
        <Suspense>
          <PeriodFilter period={period} />
        </Suspense>
      </div>

      <ChannelsBarChart data={channelsData} isLoading={isLoading} />
      <ChannelsTable
        data={channelsData}
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
