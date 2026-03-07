"use client";

import { useState, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useChannels } from "@/hooks/queries/use-channels";
import { useDebounce } from "@/hooks/use-debounce";
import { useOrganization } from "@/components/providers/organization-provider";
import { IDateFilter, IChannelParams, OrderDirection } from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/[locale]/[slug]/_components/period-filter";
import { ChannelsTreemap } from "./channels-treemap";
import { ChannelsKpiStrip } from "./channels-kpi-strip";
import { ChannelsTable } from "./channels-table";
import { Input } from "@/components/ui/input";
import { IconSearch } from "@tabler/icons-react";

const EMPTY_PAGINATION = { page: 1, limit: 30, total: 0, total_pages: 0 };

interface ChannelsContentProps {
  filter: IDateFilter;
}

export function ChannelsContent({ filter }: ChannelsContentProps) {
  const t = useTranslations("channels.content");
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [orderBy, setOrderBy] = useState<string>("revenue");
  const [orderDir, setOrderDir] = useState<OrderDirection>("DESC");

  const params: IChannelParams = {
    ...filter,
    page,
    limit,
    order_by: orderBy,
    order_dir: orderDir,
    search: debouncedSearch || undefined,
  };

  const { data: resp, isPending: isLoading } = useChannels(orgId, params);

  const channelsData = resp?.data ?? [];
  const pagination = resp?.pagination ?? EMPTY_PAGINATION;
  const stepMeta = resp?.stepMeta ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">{t("title")}</h1>
          <p className="text-xs text-zinc-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <IconSearch
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-8 w-44 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-sm"
            />
          </div>
          <Suspense>
            <PeriodFilter filter={filter} />
          </Suspense>
        </div>
      </div>

      <ChannelsKpiStrip data={resp} isLoading={isLoading} />

      <ChannelsTreemap data={channelsData} isLoading={isLoading} />

      <ChannelsTable
        data={channelsData}
        stepMeta={stepMeta}
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
