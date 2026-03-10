"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { IconPlus, IconPencil, IconTrash, IconSpeakerphone } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveTable, type TableColumn } from "@/components/ui/responsive-table";
import { MarketingSpendFormDialog } from "./marketing-spend-form-dialog";
import { useMarketingSpends } from "@/hooks/queries/use-marketing-spends";
import { useCreateMarketingSpend } from "@/hooks/mutations/use-create-marketing-spend";
import { useUpdateMarketingSpend } from "@/hooks/mutations/use-update-marketing-spend";
import { useDeleteMarketingSpend } from "@/hooks/mutations/use-delete-marketing-spend";
import { fmtBRLDecimal } from "@/utils/format";
import { MARKETING_SOURCE_OPTIONS, getMarketingSourceLabel } from "@/utils/marketing-sources";
import type { IMarketingSpend } from "@/interfaces/cost.interface";
import type { IDateFilter } from "@/interfaces/dashboard.interface";
import toast from "react-hot-toast";
import dayjs from "dayjs";

interface MarketingSpendTableProps {
  organizationId: string;
  filter?: IDateFilter;
}

const ALL_SOURCES = "__all__";

export function MarketingSpendTable({ organizationId, filter = {} }: MarketingSpendTableProps) {
  const t = useTranslations("finance.marketingSpend");
  const locale = useLocale();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IMarketingSpend | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>(ALL_SOURCES);
  const [page, setPage] = useState(1);
  const limit = 20;

  const params = {
    ...filter,
    source: sourceFilter === ALL_SOURCES ? undefined : sourceFilter,
    page,
    limit,
  };

  const { data: result, isLoading } = useMarketingSpends(organizationId, params);
  const createMutation = useCreateMarketingSpend(organizationId);
  const updateMutation = useUpdateMarketingSpend(organizationId);
  const deleteMutation = useDeleteMarketingSpend(organizationId);

  const rows = result?.data ?? [];
  const pagination = result?.pagination ?? { page: 1, limit, total: 0, total_pages: 0 };
  const totalAmountInCents = result?.totalAmountInCents ?? 0;

  const handleOpenCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row: IMarketingSpend) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: {
    source: string;
    sourceLabel: string;
    amountInCents: number;
    spentAt: string;
    description?: string;
  }) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...data });
      toast.success(t("toastUpdated"));
    } else {
      await createMutation.mutateAsync({ organizationId, ...data });
      toast.success(t("toastCreated"));
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    toast.success(t("toastDeleted"));
  };

  const columns: TableColumn<IMarketingSpend>[] = [
    {
      key: "spentAt",
      header: t("columnDate"),
      render: (row) => (
        <span className="font-mono text-xs text-zinc-400">
          {dayjs(row.spentAt).format("DD/MM/YYYY")}
        </span>
      ),
    },
    {
      key: "source",
      header: t("columnSource"),
      mobilePrimary: true,
      render: (row) => {
        const label = getMarketingSourceLabel(row.source, locale) || row.sourceLabel;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-zinc-100 text-sm">{label}</span>
            {row.description && (
              <span className="text-[10px] text-zinc-600">{row.description}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "amountInCents",
      header: t("columnAmount"),
      align: "right",
      render: (row) => (
        <span className="font-mono text-sm font-bold text-violet-400">
          {fmtBRLDecimal(row.amountInCents / 100)}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("columnActions"),
      align: "right",
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-zinc-100"
            onClick={() => handleOpenEdit(row)}
          >
            <IconPencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-red-400"
            onClick={() => handleDelete(row.id)}
            disabled={deleteMutation.isPending}
          >
            <IconTrash size={14} />
          </Button>
        </div>
      ),
    },
  ];

  const emptyState = (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/70 border border-zinc-700">
        <IconSpeakerphone size={20} className="text-zinc-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-300">{t("emptyTitle")}</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs">{t("emptyDescription")}</p>
      </div>
      <Button
        size="sm"
        onClick={handleOpenCreate}
        className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 gap-1.5 mt-1"
      >
        <IconPlus size={13} />
        {t("addFirst")}
      </Button>
    </div>
  );

  const tableHeader = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
        <p className="text-xs text-zinc-500">{t("subtitle")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {totalAmountInCents > 0 && (
          <Badge variant="outline" className="text-xs border-violet-700 bg-violet-600/10 text-violet-300 font-mono">
            {t("totalLabel")}: {fmtBRLDecimal(totalAmountInCents / 100)}
          </Badge>
        )}
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-40 bg-zinc-900 border-zinc-700 text-zinc-300 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value={ALL_SOURCES} className="text-zinc-200 focus:bg-zinc-700 text-xs">
              {t("filterBySource")}
            </SelectItem>
            {MARKETING_SOURCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.source} value={opt.source} className="text-zinc-200 focus:bg-zinc-700 text-xs">
                {locale === "en" ? opt.labelEn : opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 gap-1.5"
        >
          <IconPlus size={14} />
          <span className="hidden sm:inline">{t("add")}</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <ResponsiveTable
        columns={columns}
        data={rows}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        skeletonRows={4}
        emptyMessage={emptyState}
        header={tableHeader}
        serverPagination={{
          page: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          totalPages: pagination.total_pages,
          onPageChange: setPage,
          onPageSizeChange: (s) => { setPage(1); void s; },
          pageSizeOptions: [10, 20, 50],
        }}
      />

      <MarketingSpendFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editing}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}
