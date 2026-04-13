"use client";

import { useState, Suspense, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useLandingPages } from "@/hooks/queries/use-landing-pages";
import { useDebounce } from "@/hooks/use-debounce";
import { useOrganization } from "@/components/providers/organization-provider";
import { useOrgDataSources } from "@/hooks/queries/use-org-data-sources";
import { getDemoData } from "@/lib/demo-data";
import {
  IDateFilter,
  ILandingPageData,
  ILandingPageParams,
  ILandingPagesResult,
  IPageScatterPoint,
  OrderDirection,
} from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/[locale]/[slug]/_components/period-filter";
import { DemoModeBanner } from "@/app/[locale]/[slug]/_components/demo-mode-banner";
import { PagesTable } from "./pages-table";
import { PagesKpiStrip } from "./pages-kpi-strip";
import { PagesScatterPlot } from "./pages-scatter-plot";
import { PagesTopCards } from "./pages-top-cards";
import { Input } from "@/components/ui/input";
import { IconSearch, IconChevronDown, IconCheck, IconWorldWww } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { WelcomeState } from "@/components/ui/welcome-state";

const EMPTY_PAGINATION = { page: 1, limit: 30, total: 0, total_pages: 0 };

type PageType =
  | "product"
  | "category"
  | "checkout"
  | "system"
  | "landing"
  | "other";

const PAGE_TYPE_KEYS: PageType[] = [
  "product",
  "category",
  "checkout",
  "system",
  "landing",
  "other",
];

function classifyPage(path: string): PageType {
  const p = path.toLowerCase();

  if (
    /\/(produto|product|produtos|products|p|item|items)\//i.test(p) ||
    /\/(produto|product|produtos|products|p|item)\/?$/.test(p)
  )
    return "product";

  if (
    /\/(categoria|category|categorias|categories|catalogo|catalog|colecao|collection|tag|tags)\//i.test(p) ||
    /\/(categoria|category|catalogo|catalog)\/?$/.test(p)
  )
    return "category";

  if (
    /\/(checkout|carrinho|cart|pagamento|payment|pagar|pay|comprar|buy)\//i.test(p) ||
    /\/(checkout|carrinho|cart|pagamento|payment)\/?$/.test(p)
  )
    return "checkout";

  if (
    /\/(conta|account|login|register|signup|sign-up|cadastro|perfil|profile|dashboard|painel|configuracoes|settings|obrigado|thank-you|thanks|sucesso|success|comprovante)\//i.test(
      p
    ) ||
    /\/(conta|account|login|register|signup|cadastro|perfil|profile|obrigado|sucesso)\/?$/.test(
      p
    )
  )
    return "system";

  const segments = p.split("/").filter(Boolean);
  if (segments.length <= 1) return "landing";

  return "other";
}

interface PageTypeDropdownProps {
  selected: Set<PageType>;
  onChange: (types: Set<PageType>) => void;
}

function PageTypeDropdown({ selected, onChange }: PageTypeDropdownProps) {
  const t = useTranslations("pages.pageTypes");
  const [open, setOpen] = useState(false);

  const toggle = (type: PageType) => {
    const next = new Set(selected);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    onChange(next);
  };

  const label =
    selected.size === 0
      ? t("label")
      : selected.size === PAGE_TYPE_KEYS.length
        ? t("allTypes")
        : t("countTypes", { count: selected.size });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs transition-colors",
          selected.size > 0 && selected.size < PAGE_TYPE_KEYS.length
            ? "border-indigo-600/50 bg-indigo-600/15 text-indigo-300"
            : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 bg-zinc-900"
        )}
      >
        {label}
        <IconChevronDown size={12} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full mt-1 left-0 z-20 min-w-[160px] rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl py-1">
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              onClick={() =>
                onChange(
                  selected.size === PAGE_TYPE_KEYS.length
                    ? new Set()
                    : new Set(PAGE_TYPE_KEYS)
                )
              }
            >
              <span
                className={cn(
                  "flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors",
                  selected.size === PAGE_TYPE_KEYS.length
                    ? "border-indigo-500 bg-indigo-500"
                    : "border-zinc-600"
                )}
              >
                {selected.size === PAGE_TYPE_KEYS.length && (
                  <IconCheck size={9} className="text-white" />
                )}
              </span>
              {t("all")}
            </button>
            <div className="my-1 border-t border-zinc-800" />
            {PAGE_TYPE_KEYS.map((type) => (
              <button
                key={type}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                onClick={() => toggle(type)}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors",
                    selected.has(type)
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-zinc-600"
                  )}
                >
                  {selected.has(type) && (
                    <IconCheck size={9} className="text-white" />
                  )}
                </span>
                {t(type)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface PagesContentProps {
  filter: IDateFilter;
}

export function PagesContent({ filter }: PagesContentProps) {
  const t = useTranslations("pages.content");
  const tTour = useTranslations("tour.welcome.pages");
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const slug = organization?.slug ?? "";
  const currency = organization?.currency ?? "BRL";

  const { data: dataSources } = useOrgDataSources(orgId);
  const isDemo = !dataSources?.hasGateway;
  const demoData = isDemo ? getDemoData(currency) : null;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [orderBy, setOrderBy] = useState<string>("revenue");
  const [orderDir, setOrderDir] = useState<OrderDirection>("DESC");
  const [pageTypes, setPageTypes] = useState<Set<PageType>>(new Set());

  const params: ILandingPageParams = {
    ...filter,
    page,
    limit,
    order_by: orderBy,
    order_dir: orderDir,
    search: debouncedSearch || undefined,
  };

  const { data: resp, isPending: isLoading } = useLandingPages(orgId, params);

  const demoResp = demoData ? {
    data: demoData.pages.data,
    pagination: { page: 1, limit: 30, total: demoData.pages.data.length, total_pages: 1 },
    stepMeta: [
      { key: "pageview", label: "Visualizações" },
      { key: "signup", label: "Cadastros" },
      { key: "checkout", label: "Checkouts" },
      { key: "purchase", label: "Compras" },
    ],
    totalPages: demoData.pages.totalPages,
    pagesWithRevenue: demoData.pages.pagesWithRevenue,
    totalRevenue: demoData.pages.totalRevenue,
    bestConversionPage: demoData.pages.bestConversionPage,
    bestConversionRate: demoData.pages.bestConversionRate,
    biggestOpportunityPage: demoData.pages.biggestOpportunityPage,
    biggestOpportunityVisits: demoData.pages.biggestOpportunityVisits,
    scatterData: demoData.pages.scatterData,
  } : null;

  const effectiveResp = isDemo ? demoResp : resp;
  const effectiveLoading = isDemo ? false : isLoading;

  const allData = useMemo(() => effectiveResp?.data ?? [], [effectiveResp?.data]);
  const pagination = effectiveResp?.pagination ?? EMPTY_PAGINATION;
  const stepMeta = effectiveResp?.stepMeta ?? [];

  const hasNoData = !effectiveLoading && effectiveResp !== undefined && allData.length === 0;

  const filteredData = useMemo<ILandingPageData[]>(() => {
    if (pageTypes.size === 0) return allData;
    return allData.filter((lp) => pageTypes.has(classifyPage(lp.page)));
  }, [allData, pageTypes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">{t("title")}</h1>
          <p className="text-xs text-zinc-500">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense>
            <PeriodFilter filter={filter} />
          </Suspense>
        </div>
      </div>

      {isDemo && <DemoModeBanner module="pages" slug={slug} />}

      {hasNoData && !isDemo ? (
        <WelcomeState
          icon={IconWorldWww}
          title={tTour("title")}
          description={tTour("description")}
          ctaLabel={tTour("cta")}
          ctaHref={`/onboarding/${slug}?step=install`}
          className="min-h-[320px]"
        />
      ) : (
        <>
          <PagesKpiStrip data={effectiveResp as ILandingPagesResult | undefined} isLoading={effectiveLoading} />

          <PagesScatterPlot
            data={effectiveResp?.scatterData as IPageScatterPoint[] | undefined}
            isLoading={effectiveLoading}
          />

          <PagesTopCards
            data={allData}
            stepMeta={stepMeta}
            isLoading={effectiveLoading}
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[140px] max-w-xs">
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
                className="pl-8 h-8 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 text-sm"
              />
            </div>
            <PageTypeDropdown
              selected={pageTypes}
              onChange={(t) => {
                setPageTypes(t);
                setPage(1);
              }}
            />
          </div>

          <PagesTable
            data={filteredData}
            stepMeta={stepMeta}
            pagination={
              pageTypes.size > 0
                ? {
                    ...pagination,
                    total: filteredData.length,
                    total_pages: Math.ceil(filteredData.length / limit),
                  }
                : pagination
            }
            isLoading={effectiveLoading}
            orderBy={orderBy}
            orderDir={orderDir}
            onOrderBy={(k) => {
              setOrderBy(k);
              setPage(1);
            }}
            onOrderDir={setOrderDir}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setLimit(s);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
