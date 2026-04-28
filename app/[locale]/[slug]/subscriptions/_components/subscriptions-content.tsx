"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { useOrgDataSources } from "@/hooks/queries/use-org-data-sources";
import { getDemoData } from "@/lib/demo-data";
import { useSubscriptions } from "@/hooks/queries/use-subscriptions";
import { useDebounce } from "@/hooks/use-debounce";
import { exportSubscriptions } from "@/actions/subscriptions/export-subscriptions.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import type { ISubscriptionParams, ISubscriptionListItem } from "@/interfaces/subscription.interface";
import { SubscriptionsFilters } from "./subscriptions-filters";
import { SubscriptionsTable } from "./subscriptions-table";
import { DemoModeBanner } from "@/app/[locale]/[slug]/_components/demo-mode-banner";
import { IconRepeat, IconDownload, IconLoader2 } from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import "dayjs/locale/en";
import { useLocale } from "next-intl";

const EMPTY_PAGINATION = { page: 1, limit: 25, total: 0, total_pages: 0 };

interface SubscriptionsContentProps {
  filter: IDateFilter;
}

export function SubscriptionsContent({ filter }: SubscriptionsContentProps) {
  const t = useTranslations("subscriptions.content");
  const locale = useLocale();
  const dayjsLocale = locale === "pt" ? "pt-br" : locale;
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const slug = organization?.slug ?? "";
  const currency = organization?.currency ?? "BRL";

  const { data: dataSources, isPending: dataSourcesPending, isFetching: dataSourcesFetching } = useOrgDataSources(orgId);
  const dataSourcesNotReady = dataSourcesPending || dataSourcesFetching;
  const isDemo = !dataSourcesNotReady && !(dataSources?.hasRealData);
  const demoData = isDemo ? getDemoData(currency) : null;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedInterval, setSelectedInterval] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const params: ISubscriptionParams = {
    ...filter,
    page,
    limit,
    search: debouncedSearch || undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    plan_id: selectedPlanId || undefined,
    billing_interval: selectedInterval || undefined,
    order_dir: "DESC",
  };

  const { data: resp, isPending: isLoading } = useSubscriptions(orgId, params);

  const demoItems = demoData?.activeSubscriptions.map((s) => ({
    id: s.subscriptionId,
    subscriptionId: s.subscriptionId,
    customerId: s.customerId,
    customerName: s.customerName,
    customerEmail: s.customerEmail,
    planId: s.planId,
    planName: s.planName,
    status: s.status,
    valueInCents: s.valueInCents,
    currency,
    billingInterval: s.billingInterval,
    startedAt: s.startedAt,
    canceledAt: s.canceledAt ?? null,
    createdAt: s.startedAt,
  })) ?? [];

  const demoResp = demoData ? {
    data: demoItems,
    pagination: { page: 1, limit: 25, total: demoItems.length, total_pages: 1 },
    distinctPlans: [...new Map(demoItems.map((s) => [s.planId, { planId: s.planId, planName: s.planName }])).values()],
    distinctIntervals: [...new Set(demoItems.map((s) => s.billingInterval))],
  } : null;

  const effectiveResp = dataSourcesNotReady ? undefined : (isDemo ? demoResp : resp);
  const effectiveLoading = dataSourcesNotReady || (isDemo ? false : isLoading);

  const items = effectiveResp?.data ?? [];
  const pagination = effectiveResp?.pagination ?? EMPTY_PAGINATION;
  const distinctPlans = effectiveResp?.distinctPlans ?? [];
  const distinctIntervals = effectiveResp?.distinctIntervals ?? [];

  const hasActiveFilters =
    search.length > 0 ||
    (selectedStatus !== "active" && selectedStatus !== "all") ||
    !!selectedPlanId ||
    !!selectedInterval;

  const handleClearFilters = () => {
    setSearch("");
    setSelectedStatus("active");
    setSelectedPlanId("");
    setSelectedInterval("");
    setPage(1);
  };

  const handleExport = async () => {
    if (!orgId || isExporting) return;
    setIsExporting(true);
    try {
      const exportParams: ISubscriptionParams = { ...params };
      delete exportParams.page;
      delete exportParams.limit;
      const { csv, filename } = await exportSubscriptions(orgId, exportParams);
      if (!csv) return;
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const getFilterLabel = (f: IDateFilter): string => {
    if (f.period) {
      const periodKeys: Record<string, string> = {
        today: "today",
        yesterday: "yesterday",
        "7d": "7d",
        "30d": "30d",
        "90d": "90d",
      };
      const key = periodKeys[f.period];
      if (key) return t(`periodLabels.${key}`);
      return f.period;
    }
    if (f.start_date && f.end_date) {
      const from = dayjs(f.start_date).locale(dayjsLocale).format("D MMM");
      const to = dayjs(f.end_date).locale(dayjsLocale).format("D MMM");
      return `${from} – ${to}`;
    }
    return t("periodLabels.period");
  };

  const periodLabel = getFilterLabel(filter);

  return (
    <div className="space-y-4">
      {isDemo && <DemoModeBanner module="subscriptions" slug={slug} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-600/30 shrink-0">
            <IconRepeat size={16} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">{t("title")}</h1>
            <p className="text-xs text-zinc-500">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pagination.total > 0 && (
            <div className="text-xs text-zinc-600 font-mono bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
              <span className="text-zinc-400 font-semibold">
                {pagination.total.toLocaleString("pt-BR")}
              </span>
              <span className="mx-1 text-zinc-700">·</span>
              <span>{periodLabel}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || pagination.total === 0}
            title={t("exportCsv")}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <IconLoader2 size={13} className="animate-spin" />
            ) : (
              <IconDownload size={13} />
            )}
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <SubscriptionsFilters
          filter={filter}
          search={search}
          selectedStatus={selectedStatus}
          selectedPlanId={selectedPlanId}
          selectedInterval={selectedInterval}
          distinctPlans={distinctPlans}
          distinctIntervals={distinctIntervals}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          onStatus={(v) => {
            setSelectedStatus(v);
            setPage(1);
          }}
          onPlan={(v) => {
            setSelectedPlanId(v);
            setPage(1);
          }}
          onInterval={(v) => {
            setSelectedInterval(v);
            setPage(1);
          }}
          onClear={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      <SubscriptionsTable
        data={items as ISubscriptionListItem[]}
        pagination={pagination}
        isLoading={effectiveLoading}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setLimit(s);
          setPage(1);
        }}
      />
    </div>
  );
}
