"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { useOrgDataSources } from "@/hooks/queries/use-org-data-sources";
import { getDemoData } from "@/lib/demo-data";
import { useCustomers } from "@/hooks/queries/use-customers";
import { formatDate } from "@/utils/format-date";
import {
  IconSearch,
  IconUser,
  IconMapPin,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChannelBadge } from "@/components/ui/channel-badge";
import { DemoModeBanner } from "@/app/[locale]/[slug]/_components/demo-mode-banner";
import type { ICustomer, ICustomerListParams } from "@/interfaces/customer.interface";
import { AtRiskCustomers } from "./at-risk-customers";
import { TopCustomersRanking } from "./top-customers-ranking";
import { CustomerCohorts } from "./customer-cohorts";
import { ExpansionCandidates } from "./expansion-candidates";
import { useSensitiveMode } from "@/hooks/use-sensitive-mode";

function AllCustomersList() {
  const t = useTranslations("customers");
  const { organization } = useOrganization();
  const slug = organization?.slug ?? "";
  const orgId = organization?.id ?? "";
  const timezone = organization?.timezone ?? "America/Sao_Paulo";
  const currency = organization?.currency ?? "BRL";

  const { data: dataSources } = useOrgDataSources(orgId || undefined);
  const isDemo = !dataSources?.hasGateway;
  const demoData = isDemo ? getDemoData(currency) : null;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<ICustomerListParams["sortBy"]>("lastSeenAt");
  const [page, setPage] = useState(1);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout((window as Window & { _searchTimeout?: ReturnType<typeof setTimeout> })._searchTimeout);
    (window as Window & { _searchTimeout?: ReturnType<typeof setTimeout> })._searchTimeout = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }, []);

  const params: ICustomerListParams = {
    search: debouncedSearch || undefined,
    sortBy,
    page,
    limit: 25,
  };

  const { data, isLoading } = useCustomers(orgId, params);

  const demoCustomers: ICustomer[] = (demoData?.customers ?? []).map((c) => ({
    id: c.id,
    organizationId: orgId,
    customerId: c.customerId,
    name: c.name,
    email: c.email,
    phone: null,
    country: null,
    region: null,
    city: null,
    avatarUrl: null,
    metadata: null,
    firstSource: c.firstSource,
    firstMedium: null,
    firstCampaign: null,
    firstContent: null,
    firstLandingPage: c.firstLandingPage,
    firstReferrer: null,
    firstDevice: c.firstDevice,
    firstSeenAt: c.firstSeenAt,
    lastSeenAt: c.lastSeenAt,
    createdAt: c.firstSeenAt,
    updatedAt: c.lastSeenAt,
  }));

  const customers = isDemo ? demoCustomers : (data?.data ?? []);
  const pagination = isDemo
    ? { page: 1, limit: 25, total: demoCustomers.length, total_pages: 1 }
    : data?.pagination;

  const { isSensitive, maskName, maskEmail, maskLocation } = useSensitiveMode();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("search")}
            className="pl-8 h-8 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 placeholder:text-zinc-600"
          />
        </div>

        <Select
          value={sortBy ?? "lastSeenAt"}
          onValueChange={(v) => {
            setSortBy(v as ICustomerListParams["sortBy"]);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-40 bg-zinc-900 border-zinc-700 text-zinc-300 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {(["lastSeenAt", "firstSeenAt", "name", "email"] as const).map((opt) => (
              <SelectItem key={opt} value={opt} className="text-zinc-300 focus:bg-zinc-800 text-xs">
                {t(`sortOptions.${opt}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_150px_110px_100px_100px] px-4 py-2 border-b border-zinc-800/60 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          <span>{t("table.customer")}</span>
          <span>{t("table.location")}</span>
          <span>{t("table.channel")}</span>
          <span>{t("table.firstSeen")}</span>
          <span>{t("table.lastSeen")}</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-zinc-800/40">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <IconUser size={32} className="text-zinc-700 mb-3" />
            <p className="text-sm font-medium text-zinc-400">
              {debouncedSearch ? t("empty.noResults") : t("empty.title")}
            </p>
            {!debouncedSearch && (
              <p className="text-xs text-zinc-600 mt-1 max-w-xs">{t("empty.description")}</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/${slug}/customers/${customer.customerId}`}
                className="flex sm:grid sm:grid-cols-[1fr_150px_110px_100px_100px] items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
                    customer.name
                      ? "bg-violet-500/15 text-violet-400"
                      : "bg-zinc-800 text-zinc-600"
                  )}>
                    {customer.name
                      ? customer.name.charAt(0).toUpperCase()
                      : <IconUser size={14} />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-zinc-100">
                      {customer.name
                        ? (isSensitive ? maskName(customer.name) : customer.name)
                        : <span className="text-zinc-500 italic">{t("empty.title")}</span>}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {customer.email
                        ? (isSensitive ? maskEmail(customer.email) : customer.email)
                        : (
                          <span className="font-mono text-zinc-700">{customer.customerId.slice(0, 20)}…</span>
                        )}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-500">
                  {(customer.country || customer.city) && (
                    <IconMapPin size={11} className="shrink-0 text-zinc-600" />
                  )}
                  <span className="truncate">
                    {isSensitive
                      ? maskLocation(customer.city ?? null, customer.country ?? null)
                      : ([customer.city, customer.country].filter(Boolean).join(", ") || "—")}
                  </span>
                </div>

                <span className="hidden sm:block truncate">
                  <ChannelBadge
                    source={customer.firstSource}
                    medium={customer.firstMedium}
                    size="xs"
                  />
                </span>

                <span className="hidden sm:block text-xs text-zinc-500">
                  {formatDate(customer.firstSeenAt, timezone, "DD/MM/YY")}
                </span>

                <span className="hidden sm:block text-xs text-zinc-500">
                  {formatDate(customer.lastSeenAt, timezone, "DD/MM/YY")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-600">
            {pagination.total} cliente{pagination.total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <IconChevronLeft size={16} />
            </button>
            <span className="text-xs text-zinc-500 px-2">
              {page} / {pagination.total_pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              disabled={page === pagination.total_pages}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomersContent() {
  const t = useTranslations("customers");
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const slug = organization?.slug ?? "";

  const { data: dataSources } = useOrgDataSources(orgId);
  const isDemo = !dataSources?.hasGateway;

  return (
    <div className="space-y-4">
      {isDemo && <DemoModeBanner module="customers" slug={slug} />}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">{t("title")}</h1>
          <p className="text-xs text-zinc-500">{t("subtitle")}</p>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="bg-zinc-900/60 border border-zinc-800/60 h-9 p-1 w-full sm:w-auto">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
            {t("tabs.all")}
          </TabsTrigger>
          <TabsTrigger value="atRisk" className="text-xs data-[state=active]:bg-rose-600/20 data-[state=active]:text-rose-300">
            {t("tabs.atRisk")}
          </TabsTrigger>
          <TabsTrigger value="top" className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
            {t("tabs.topCustomers")}
          </TabsTrigger>
          <TabsTrigger value="cohorts" className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
            {t("tabs.cohorts")}
          </TabsTrigger>
          <TabsTrigger value="expansion" className="text-xs data-[state=active]:bg-indigo-600/20 data-[state=active]:text-indigo-300">
            {t("tabs.expansion")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <AllCustomersList />
        </TabsContent>

        <TabsContent value="atRisk" className="mt-4">
          <AtRiskCustomers />
        </TabsContent>

        <TabsContent value="top" className="mt-4">
          <TopCustomersRanking />
        </TabsContent>

        <TabsContent value="cohorts" className="mt-4">
          <CustomerCohorts />
        </TabsContent>

        <TabsContent value="expansion" className="mt-4">
          <ExpansionCandidates />
        </TabsContent>
      </Tabs>
    </div>
  );
}
