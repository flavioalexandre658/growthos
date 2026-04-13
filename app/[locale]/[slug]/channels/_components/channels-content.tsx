"use client";

import { useState, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useChannels } from "@/hooks/queries/use-channels";
import { useDebounce } from "@/hooks/use-debounce";
import { useOrganization } from "@/components/providers/organization-provider";
import { useOrgDataSources } from "@/hooks/queries/use-org-data-sources";
import { getDemoData } from "@/lib/demo-data";
import { IDateFilter, IChannelParams, OrderDirection } from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/[locale]/[slug]/_components/period-filter";
import { DemoModeBanner } from "@/app/[locale]/[slug]/_components/demo-mode-banner";
import { ChannelsTreemap } from "./channels-treemap";
import { ChannelsKpiStrip } from "./channels-kpi-strip";
import { ChannelsTable } from "./channels-table";
import { ChannelsInvestmentKpis } from "./channels-investment-kpis";
import { ChannelsCampaigns } from "./channels-campaigns";
import { Input } from "@/components/ui/input";
import { IconSearch, IconBrandGoogle } from "@tabler/icons-react";
import { WelcomeState } from "@/components/ui/welcome-state";

const EMPTY_PAGINATION = { page: 1, limit: 30, total: 0, total_pages: 0 };

interface ChannelsContentProps {
  filter: IDateFilter;
  initialSearch?: string;
}

export function ChannelsContent({ filter, initialSearch }: ChannelsContentProps) {
  const t = useTranslations("channels.content");
  const tTour = useTranslations("tour.welcome.channels");
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const slug = organization?.slug ?? "";
  const locale = organization?.locale ?? "pt-BR";
  const currency = organization?.currency ?? "BRL";

  const { data: dataSources } = useOrgDataSources(orgId);
  const isDemo = !dataSources?.hasGateway;
  const demoData = isDemo ? getDemoData(currency) : null;

  const [search, setSearch] = useState(initialSearch ?? "");
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

  const demoResp = demoData ? {
    data: demoData.channels.data,
    pagination: { page: 1, limit: 30, total: demoData.channels.data.length, total_pages: 1 },
    stepMeta: [
      { key: "pageview", label: "Visualizações" },
      { key: "signup", label: "Cadastros" },
      { key: "checkout", label: "Checkouts" },
      { key: "purchase", label: "Compras" },
    ],
    investmentGroups: [],
    totalRevenue: demoData.channels.totalRevenue,
    channelsWithRevenue: demoData.channels.channelsWithRevenue,
    topChannel: demoData.channels.topChannel,
    concentrationTop2: demoData.channels.concentrationTop2,
  } : null;

  const effectiveResp = isDemo ? demoResp : resp;
  const effectiveLoading = isDemo ? false : isLoading;

  const channelsData = effectiveResp?.data ?? [];
  const pagination = effectiveResp?.pagination ?? EMPTY_PAGINATION;
  const stepMeta = effectiveResp?.stepMeta ?? [];
  const investmentGroups = effectiveResp?.investmentGroups ?? [];

  const hasNoData = !effectiveLoading && effectiveResp !== undefined && channelsData.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">{t("title")}</h1>
          <p className="text-xs text-zinc-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!hasNoData && (
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
          )}
          <Suspense>
            <PeriodFilter filter={filter} />
          </Suspense>
        </div>
      </div>

      {isDemo && <DemoModeBanner module="channels" slug={slug} locale={locale} />}

      {hasNoData && !isDemo ? (
        <WelcomeState
          icon={IconBrandGoogle}
          title={tTour("title")}
          description={tTour("description")}
          ctaLabel={tTour("cta")}
          ctaHref={`/onboarding/${slug}?step=install`}
          className="min-h-[320px]"
        />
      ) : (
        <>
          <ChannelsKpiStrip data={effectiveResp as any} isLoading={effectiveLoading} />

          {investmentGroups.length > 0 && (
            <ChannelsInvestmentKpis groups={investmentGroups} />
          )}

          <ChannelsCampaigns filter={filter} />

          <ChannelsTreemap data={channelsData} isLoading={effectiveLoading} />

          <ChannelsTable
            data={channelsData}
            stepMeta={stepMeta}
            pagination={pagination}
            isLoading={effectiveLoading}
            orderBy={orderBy}
            orderDir={orderDir}
            onOrderBy={(k) => { setOrderBy(k); setPage(1); }}
            onOrderDir={setOrderDir}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
          />
        </>
      )}
    </div>
  );
}
