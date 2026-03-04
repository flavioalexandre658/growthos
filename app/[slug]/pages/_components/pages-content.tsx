"use client";

import { useState, Suspense, useMemo } from "react";
import { useLandingPages } from "@/hooks/queries/use-landing-pages";
import { useDebounce } from "@/hooks/use-debounce";
import { useOrganization } from "@/components/providers/organization-provider";
import {
  IDateFilter,
  ILandingPageData,
  ILandingPageParams,
  OrderDirection,
} from "@/interfaces/dashboard.interface";
import { PeriodFilter } from "@/app/[slug]/_components/period-filter";
import { PagesTable } from "./pages-table";
import { PagesKpiStrip } from "./pages-kpi-strip";
import { PagesScatterPlot } from "./pages-scatter-plot";
import { PagesTopCards } from "./pages-top-cards";
import { Input } from "@/components/ui/input";
import { IconSearch, IconChevronDown, IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const EMPTY_PAGINATION = { page: 1, limit: 30, total: 0, total_pages: 0 };

type PageType =
  | "Produto"
  | "Categoria"
  | "Checkout"
  | "Sistema"
  | "Entrada"
  | "Outras";

const PAGE_TYPE_LABELS: PageType[] = [
  "Produto",
  "Categoria",
  "Checkout",
  "Sistema",
  "Entrada",
  "Outras",
];

function classifyPage(path: string): PageType {
  const p = path.toLowerCase();

  if (
    /\/(produto|product|produtos|products|p|item|items)\//i.test(p) ||
    /\/(produto|product|produtos|products|p|item)\/?$/.test(p)
  )
    return "Produto";

  if (
    /\/(categoria|category|categorias|categories|catalogo|catalog|colecao|collection|tag|tags)\//i.test(p) ||
    /\/(categoria|category|catalogo|catalog)\/?$/.test(p)
  )
    return "Categoria";

  if (
    /\/(checkout|carrinho|cart|pagamento|payment|pagar|pay|comprar|buy)\//i.test(p) ||
    /\/(checkout|carrinho|cart|pagamento|payment)\/?$/.test(p)
  )
    return "Checkout";

  if (
    /\/(conta|account|login|register|signup|sign-up|cadastro|perfil|profile|dashboard|painel|configuracoes|settings|obrigado|thank-you|thanks|sucesso|success|comprovante)\//i.test(
      p
    ) ||
    /\/(conta|account|login|register|signup|cadastro|perfil|profile|obrigado|sucesso)\/?$/.test(
      p
    )
  )
    return "Sistema";

  const segments = p.split("/").filter(Boolean);
  if (segments.length <= 1) return "Entrada";

  return "Outras";
}

interface PageTypeDropdownProps {
  selected: Set<PageType>;
  onChange: (types: Set<PageType>) => void;
}

function PageTypeDropdown({ selected, onChange }: PageTypeDropdownProps) {
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
      ? "Tipo de Página"
      : selected.size === PAGE_TYPE_LABELS.length
        ? "Todos os tipos"
        : `${selected.size} tipo${selected.size > 1 ? "s" : ""}`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs transition-colors",
          selected.size > 0 && selected.size < PAGE_TYPE_LABELS.length
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
                  selected.size === PAGE_TYPE_LABELS.length
                    ? new Set()
                    : new Set(PAGE_TYPE_LABELS)
                )
              }
            >
              <span
                className={cn(
                  "flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors",
                  selected.size === PAGE_TYPE_LABELS.length
                    ? "border-indigo-500 bg-indigo-500"
                    : "border-zinc-600"
                )}
              >
                {selected.size === PAGE_TYPE_LABELS.length && (
                  <IconCheck size={9} className="text-white" />
                )}
              </span>
              Todos
            </button>
            <div className="my-1 border-t border-zinc-800" />
            {PAGE_TYPE_LABELS.map((type) => (
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
                {type}
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
  const { organization } = useOrganization();
  const orgId = organization?.id;

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

  const allData = useMemo(() => resp?.data ?? [], [resp?.data]);
  const pagination = resp?.pagination ?? EMPTY_PAGINATION;
  const stepMeta = resp?.stepMeta ?? [];

  const filteredData = useMemo<ILandingPageData[]>(() => {
    if (pageTypes.size === 0) return allData;
    return allData.filter((lp) => pageTypes.has(classifyPage(lp.page)));
  }, [allData, pageTypes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Páginas</h1>
          <p className="text-xs text-zinc-500">
            Conversão e receita por página de entrada
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense>
            <PeriodFilter filter={filter} />
          </Suspense>
        </div>
      </div>

      <PagesKpiStrip data={resp} isLoading={isLoading} />

      <PagesScatterPlot
        data={resp?.scatterData}
        isLoading={isLoading}
      />

      <PagesTopCards
        data={allData}
        stepMeta={stepMeta}
        isLoading={isLoading}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <IconSearch
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <Input
            placeholder="Buscar página..."
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
        isLoading={isLoading}
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
    </div>
  );
}
