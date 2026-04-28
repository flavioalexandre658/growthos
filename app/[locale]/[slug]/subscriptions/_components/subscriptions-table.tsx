"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import "dayjs/locale/en";
import { useOrganization } from "@/components/providers/organization-provider";
import { formatDate } from "@/utils/format-date";
import {
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconDots,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmtCurrencyDecimal } from "@/utils/format";
import { getStatusBadgeClass } from "./subscriptions-filters";
import type { ISubscriptionListItem } from "@/interfaces/subscription.interface";
import type { IPaginationMeta } from "@/interfaces/dashboard.interface";

dayjs.extend(relativeTime);

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1.5 shrink-0 p-0.5 rounded text-zinc-700 hover:text-zinc-300 transition-colors"
      title={label}
    >
      {copied ? (
        <IconCheck size={11} className="text-emerald-400" />
      ) : (
        <IconCopy size={11} />
      )}
    </button>
  );
}

function DetailField({
  label,
  value,
  mono = false,
  copyable = false,
  copyLabel,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  copyLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600 shrink-0 w-[120px]">
        {label}
      </span>
      <div className="flex items-center gap-0 flex-1 min-w-0 justify-end">
        <span
          className={cn(
            "text-xs truncate",
            mono ? "font-mono text-zinc-300" : "text-zinc-300",
          )}
          title={value}
        >
          {value}
        </span>
        {copyable && <CopyButton value={value} label={copyLabel ?? ""} />}
      </div>
    </div>
  );
}

function SubscriptionDetailGrid({ item, timezone, copyLabel }: { item: ISubscriptionListItem; timezone: string; copyLabel: string }) {
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 divide-y divide-zinc-800/40 overflow-hidden">
      <DetailField
        label="subscription_id"
        value={item.subscriptionId}
        mono
        copyable
        copyLabel={copyLabel}
      />
      <DetailField label="customer_id" value={item.customerId} mono copyable copyLabel={copyLabel} />
      <DetailField label="plan_id" value={item.planId} mono copyable copyLabel={copyLabel} />
      <DetailField label="currency" value={item.currency} />
      {item.canceledAt && (
        <DetailField
          label="canceled_at"
          value={formatDate(item.canceledAt, timezone)}
        />
      )}
    </div>
  );
}

function SubscriptionCard({ item, timezone, t, locale, currency }: { item: ISubscriptionListItem; timezone: string; t: ReturnType<typeof useTranslations>; locale: string; currency: string }) {
  const [expanded, setExpanded] = useState(false);

  const displayValue = item.baseValueInCents ?? item.valueInCents;
  const displayCurrency = item.baseValueInCents != null
    ? (item.baseCurrency ?? currency)
    : (item.currency ?? currency);

  const billingIntervals: Record<string, string> = {
    monthly: t("billingIntervals.monthly"),
    quarterly: t("billingIntervals.quarterly"),
    semiannual: t("billingIntervals.semiannual"),
    yearly: t("billingIntervals.yearly"),
    weekly: t("billingIntervals.weekly"),
  };

  const statusLabels: Record<string, string> = {
    active: t("statusLabels.active"),
    trialing: t("statusLabels.trialing"),
    past_due: t("statusLabels.past_due"),
    canceled: t("statusLabels.canceled"),
  };

  return (
    <div className="border-b border-zinc-800/60 px-3 py-3 transition-colors">
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] font-semibold shrink-0",
                  getStatusBadgeClass(item.status),
                )}
              >
                {statusLabels[item.status] ?? item.status}
              </span>
              <span className="text-xs text-zinc-300 truncate font-medium">
                {item.planName}
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-400 shrink-0">
              {fmtCurrencyDecimal(displayValue / 100, locale, displayCurrency)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="text-zinc-600 font-mono truncate max-w-[160px]">
              {item.customerName ?? item.customerId}
            </span>
            <span className="text-zinc-600">
              {billingIntervals[item.billingInterval] ?? item.billingInterval}
            </span>
            <span className="text-zinc-600">
              {t("since", { date: formatDate(item.startedAt, timezone, "DD/MM/YYYY") })}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
        >
          <IconDots size={14} />
        </button>
      </div>

      {expanded && (
        <div className="mt-2.5 pt-2.5 border-t border-zinc-800/40">
          <SubscriptionDetailGrid item={item} timezone={timezone} copyLabel={t("copy")} />
        </div>
      )}
    </div>
  );
}

function SubscriptionRow({ item, timezone, t, dayjsLocale, slug, locale, currency }: { item: ISubscriptionListItem; timezone: string; t: ReturnType<typeof useTranslations>; dayjsLocale: string; slug: string; locale: string; currency: string }) {
  const [expanded, setExpanded] = useState(false);

  const displayValue = item.baseValueInCents ?? item.valueInCents;
  const displayCurrency = item.baseValueInCents != null
    ? (item.baseCurrency ?? currency)
    : (item.currency ?? currency);

  const billingIntervals: Record<string, string> = {
    monthly: t("billingIntervals.monthly"),
    quarterly: t("billingIntervals.quarterly"),
    semiannual: t("billingIntervals.semiannual"),
    yearly: t("billingIntervals.yearly"),
    weekly: t("billingIntervals.weekly"),
  };

  const statusLabels: Record<string, string> = {
    active: t("statusLabels.active"),
    trialing: t("statusLabels.trialing"),
    past_due: t("statusLabels.past_due"),
    canceled: t("statusLabels.canceled"),
  };

  return (
    <>
      <tr className="border-b border-zinc-800/60 transition-colors group/row hover:bg-zinc-900/40">
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
            >
              {expanded ? (
                <IconChevronDown size={13} />
              ) : (
                <IconChevronRight size={13} />
              )}
            </button>
            <Link
              href={`/${slug}/customers/${item.customerId}`}
              className="flex flex-col min-w-0 group/link"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-xs font-medium text-zinc-300 truncate max-w-[160px] group-hover/link:text-violet-400 transition-colors">
                {item.customerName ?? <span className="font-mono text-zinc-500">{item.customerId.slice(0, 16)}…</span>}
              </span>
              {item.customerEmail && (
                <span className="text-[10px] text-zinc-600 truncate max-w-[160px]">{item.customerEmail}</span>
              )}
            </Link>
          </div>
        </td>
        <td className="px-3 py-2.5 max-w-[180px]">
          <span className="text-xs text-zinc-200 truncate block">
            {item.planName}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right">
          <span className="text-xs font-mono font-semibold text-emerald-400">
            {fmtCurrencyDecimal(displayValue / 100, locale, displayCurrency)}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <span className="text-xs text-zinc-400">
            {billingIntervals[item.billingInterval] ?? item.billingInterval}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] font-semibold",
              getStatusBadgeClass(item.status),
            )}
          >
            {statusLabels[item.status] ?? item.status}
          </span>
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-mono text-zinc-300">
              {formatDate(item.startedAt, timezone, "DD/MM/YYYY")}
            </span>
            <span className="text-[10px] text-zinc-600">
              {dayjs(item.startedAt).locale(dayjsLocale).fromNow()}
            </span>
          </div>
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          {item.canceledAt ? (
            <span className="text-xs font-mono text-zinc-500">
              {formatDate(item.canceledAt, timezone, "DD/MM/YYYY")}
            </span>
          ) : (
            <span className="text-xs text-zinc-700">—</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-zinc-800/60 bg-zinc-950/60">
          <td colSpan={7} className="px-4 py-3">
            <div className="pl-5">
              <SubscriptionDetailGrid item={item} timezone={timezone} copyLabel={t("copy")} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface SubscriptionsTableProps {
  data: ISubscriptionListItem[];
  pagination: IPaginationMeta;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function SubscriptionsTable({
  data,
  pagination,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: SubscriptionsTableProps) {
  const t = useTranslations("subscriptions.table");
  const locale = useLocale();
  const dayjsLocale = locale === "pt" ? "pt-br" : locale;
  const { organization } = useOrganization();
  const timezone = organization?.timezone ?? "America/Sao_Paulo";
  const slug = organization?.slug ?? "";
  const orgLocale = organization?.locale ?? "pt-BR";
  const orgCurrency = organization?.currency ?? "BRL";
  const paginationStart =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const paginationEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  const paginationBar = pagination.total > 0 && (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 hidden sm:inline">
          {t("rowsPerPage")}
        </span>
        <Select
          value={String(pagination.limit)}
          onValueChange={(v) => {
            onPageSizeChange(Number(v));
            onPageChange(1);
          }}
        >
          <SelectTrigger className="h-7 w-16 bg-zinc-900 border-zinc-700 text-zinc-300 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {[25, 50, 100].map((s) => (
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
        <span className="text-xs text-zinc-500 tabular-nums">
          {t("paginationRange", { start: paginationStart, end: paginationEnd, total: pagination.total })}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            <IconChevronLeft size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
            disabled={pagination.page >= pagination.total_pages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            <IconChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("colClient")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("colPlan")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 text-right">
                {t("colValue")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("colInterval")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("colStatus")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("colStartedAt")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("colCanceledAt")}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-800/40">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <Skeleton className="h-4 w-full rounded bg-zinc-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-zinc-600"
                >
                  {t("empty")}
                </td>
              </tr>
            ) : (
              data.map((item) => <SubscriptionRow key={item.id} item={item} timezone={timezone} t={t} dayjsLocale={dayjsLocale} slug={slug} locale={orgLocale} currency={orgCurrency} />)
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="border-b border-zinc-800/40 px-3 py-3.5 space-y-2"
              >
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-28 rounded bg-zinc-800" />
                  <Skeleton className="h-3 w-16 rounded bg-zinc-800" />
                </div>
                <Skeleton className="h-3 w-40 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-600">
            {t("empty")}
          </div>
        ) : (
          data.map((item) => <SubscriptionCard key={item.id} item={item} timezone={timezone} t={t} locale={orgLocale} currency={orgCurrency} />)
        )}
      </div>

      {!isLoading && <div className="md:hidden">{paginationBar}</div>}
      <div className="hidden md:block">{paginationBar}</div>
    </div>
  );
}
