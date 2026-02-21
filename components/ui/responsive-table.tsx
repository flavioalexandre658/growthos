"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Skeleton } from "./skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export interface TableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
  mobilePrimary?: boolean;
  mobileHide?: boolean;
}

export interface ServerPaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

interface ResponsiveTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  header?: React.ReactNode;
  serverPagination?: ServerPaginationConfig;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZES = [10, 25, 50];

function PaginationBar({
  page,
  totalPages,
  pageSize,
  pageSizeOptions,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  pageSizeOptions: number[];
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Linhas por página</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            onPageSizeChange(Number(v));
            onPageChange(1);
          }}
        >
          <SelectTrigger className="h-7 w-16 bg-zinc-900 border-zinc-700 text-zinc-300 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {pageSizeOptions.map((s) => (
              <SelectItem
                key={s}
                value={String(s)}
                className="text-zinc-300 focus:bg-zinc-800 text-xs"
              >
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500">
          {start}–{end} de {total}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <IconChevronLeft size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <IconChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ResponsiveTable<T>({
  columns,
  data,
  getRowKey,
  isLoading = false,
  skeletonRows = 8,
  emptyMessage = "Nenhum dado encontrado",
  header,
  serverPagination,
  initialPageSize = 25,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}: ResponsiveTableProps<T>) {
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(initialPageSize);

  const isServer = !!serverPagination;

  const page = isServer ? serverPagination!.page : clientPage;
  const pageSize = isServer ? serverPagination!.pageSize : clientPageSize;
  const total = isServer ? serverPagination!.total : data.length;
  const totalPages = isServer
    ? serverPagination!.totalPages
    : Math.max(1, Math.ceil(data.length / clientPageSize));

  const handlePageChange = isServer
    ? serverPagination!.onPageChange
    : setClientPage;

  const handlePageSizeChange = isServer
    ? (s: number) => { serverPagination!.onPageSizeChange(s); serverPagination!.onPageChange(1); }
    : (s: number) => { setClientPageSize(s); setClientPage(1); };

  const pageSizes = isServer
    ? (serverPagination!.pageSizeOptions ?? pageSizeOptions)
    : pageSizeOptions;

  const rows = isServer
    ? data
    : data.slice((clientPage - 1) * clientPageSize, clientPage * clientPageSize);

  const primaryCol = columns.find((c) => c.mobilePrimary) ?? columns[0];
  const mobileDetailCols = columns.filter(
    (c) => !c.mobileHide && c.key !== primaryCol.key
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {header && (
        <div className="px-5 py-4 border-b border-zinc-800">{header}</div>
      )}

      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap",
                    col.align === "right" ? "text-right" : "text-left"
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-800/60">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <Skeleton className="h-4 w-full bg-zinc-800" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.length === 0
              ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-zinc-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )
              : rows.map((row) => (
                  <tr
                    key={getRowKey(row)}
                    className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3",
                          col.align === "right" && "text-right"
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-b border-zinc-800/60 p-4 space-y-3">
                <Skeleton className="h-5 w-48 bg-zinc-800" />
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full bg-zinc-800" />
                  ))}
                </div>
              </div>
            ))
          : rows.length === 0
          ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              {emptyMessage}
            </div>
          )
          : rows.map((row) => (
              <div
                key={getRowKey(row)}
                className="border-b border-zinc-800/60 p-4 last:border-b-0"
              >
                <div className="mb-3">{primaryCol.render(row)}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {mobileDetailCols.map((col) => (
                    <div key={col.key}>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 mb-0.5">
                        {col.header}
                      </p>
                      {col.render(row)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
      </div>

      {/* ── Pagination ── */}
      {!isLoading && total > 0 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={pageSizes}
          total={total}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}
