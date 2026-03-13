"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import "dayjs/locale/en";
import { useOrganization } from "@/components/providers/organization-provider";
import { formatDate } from "@/utils/format-date";
import {
  IconTrash,
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconLoader2,
  IconDots,
  IconAlertTriangle,
  IconX,
  IconAlertCircle,
  IconRepeat,
  IconRoute,
  IconUserSearch,
  IconUser,
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
import { useDeleteEvent } from "@/hooks/mutations/use-delete-event";
import { useDeleteEventsBatch } from "@/hooks/mutations/use-delete-events-batch";
import { getEventTypeBadgeClass } from "./events-filters";
import { SessionTimeline } from "./session-timeline";
import { CustomerTimeline } from "./customer-timeline";
import { DetailField, CopyButton } from "./event-detail-field";
import type { DetailFieldProps } from "./event-detail-field";
import type { IEvent } from "@/interfaces/event.interface";
import type { IPaginationMeta } from "@/interfaces/dashboard.interface";
import { useSensitiveMode } from "@/hooks/use-sensitive-mode";

dayjs.extend(relativeTime);

function EventDetailGrid({
  event,
  organizationId,
}: {
  event: IEvent;
  organizationId: string;
}) {
  const t = useTranslations("events.eventsTable");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const { isSensitive, maskName } = useSensitiveMode();
  const fields: DetailFieldProps[] = [];

  if (event.productId)
    fields.push({ label: "product_id", value: event.productId, mono: true, copyable: true });
  if (event.landingPage)
    fields.push({ label: "landing_page", value: event.landingPage, mono: true, copyable: true });
  if (event.campaign)
    fields.push({ label: "campaign", value: event.campaign, copyable: true });
  if (event.medium)
    fields.push({ label: "medium", value: event.medium });
  if (event.category)
    fields.push({ label: "category", value: event.category });
  if (event.paymentMethod)
    fields.push({ label: "payment_method", value: event.paymentMethod });
  if (event.eventHash)
    fields.push({ label: "event_hash", value: event.eventHash, mono: true, copyable: true, dim: true });
  fields.push({ label: "event_id", value: event.id, mono: true, copyable: true, dim: true });

  return (
    <div className="space-y-2">
      {event.sessionId && (
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600 shrink-0 w-[100px]">
              session_id
            </span>
            <div className="flex items-center gap-0 flex-1 min-w-0 justify-end">
              <span className="text-xs font-mono text-zinc-300 truncate" title={event.sessionId}>
                {event.sessionId}
              </span>
              <CopyButton value={event.sessionId} />
              <button
                type="button"
                onClick={() => setSessionOpen((v) => !v)}
                title={t("viewSessionTimeline")}
                className={cn(
                  "ml-1.5 shrink-0 p-0.5 rounded transition-colors",
                  sessionOpen
                    ? "text-indigo-400 hover:text-indigo-300"
                    : "text-zinc-700 hover:text-indigo-400"
                )}
              >
                <IconRoute size={12} />
              </button>
            </div>
          </div>
          {sessionOpen && (
            <div className="px-3 pb-3 border-t border-zinc-800/40">
              <SessionTimeline
                organizationId={organizationId}
                sessionId={event.sessionId}
                currentEventId={event.id}
              />
            </div>
          )}
        </div>
      )}
      {event.customerId && (
        <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600 shrink-0 w-[100px]">
              customer_id
            </span>
            <div className="flex items-center gap-0 flex-1 min-w-0 justify-end">
              {event.customerName && (
                <span className="text-xs font-medium text-zinc-300 truncate mr-2 max-w-[120px]">
                  {isSensitive ? maskName(event.customerName) : event.customerName}
                </span>
              )}
              <span className="text-xs font-mono text-zinc-500 truncate" title={event.customerId}>
                {event.customerId}
              </span>
              <CopyButton value={event.customerId} />
              <button
                type="button"
                onClick={() => setCustomerOpen((v) => !v)}
                title={t("viewCustomerFunnel")}
                className={cn(
                  "ml-1.5 shrink-0 p-0.5 rounded transition-colors",
                  customerOpen
                    ? "text-violet-400 hover:text-violet-300"
                    : "text-zinc-700 hover:text-violet-400"
                )}
              >
                <IconUserSearch size={12} />
              </button>
            </div>
          </div>
          {customerOpen && (
            <div className="px-3 pb-3 border-t border-zinc-800/40">
              <CustomerTimeline
                organizationId={organizationId}
                customerId={event.customerId}
                currentEventId={event.id}
              />
            </div>
          )}
        </div>
      )}
      <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 divide-y divide-zinc-800/40 overflow-hidden">
        {fields.map((f) => (
          <DetailField key={f.label} {...f} />
        ))}
      </div>
    </div>
  );
}

function formatEventValue(event: IEvent): string | null {
  const cents = event.baseGrossValueInCents ?? event.grossValueInCents;
  if (cents == null) return null;
  const currency = event.baseCurrency ?? "BRL";
  const locale = currency === "BRL" ? "pt-BR" : "en-US";
  return fmtCurrencyDecimal(cents / 100, locale, currency);
}

function hasEventDetails(event: IEvent) {
  return !!(
    event.sessionId ||
    event.customerId ||
    event.campaign ||
    event.landingPage ||
    event.category ||
    event.paymentMethod ||
    event.productId ||
    event.medium
  );
}

function EventCard({
  event,
  organizationId,
  timezone,
  slug,
  isSelected,
  onToggle,
}: {
  event: IEvent;
  organizationId: string;
  timezone: string;
  slug: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  const t = useTranslations("events.eventsTable");
  const locale = useLocale();
  const dayjsLocale = locale === "pt" ? "pt-br" : locale;
  const [expanded, setExpanded] = useState(false);
  const deleteMutation = useDeleteEvent();
  const details = hasEventDetails(event);
  const { isSensitive, maskName } = useSensitiveMode();

  const handleDelete = async () => {
    try {
      const result = await deleteMutation.mutateAsync({ id: event.id, organizationId });
      if (!result || (Array.isArray(result) && result.length === 0)) {
        toast.error(t("deleteEventError"));
        return;
      }
      toast.success(t("eventDeleted"));
    } catch {
      toast.error(t("deleteEventError"));
    }
  };

  return (
    <div
      className={cn(
        "border-b border-zinc-800/60 px-3 py-3 transition-colors",
        isSelected ? "bg-indigo-950/20" : ""
      )}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(event.id)}
          className="accent-indigo-500 h-3.5 w-3.5 mt-1 shrink-0 cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] font-mono font-semibold shrink-0",
                  getEventTypeBadgeClass(event.eventType)
                )}
              >
                {event.eventType}
              </span>
              {event.eventType === "renewal" && (
                <span className="rounded border border-sky-600/40 bg-sky-600/15 px-1.5 py-0.5 text-[9px] font-semibold text-sky-300 shrink-0">
                  {t("renewalBadge")}
                </span>
              )}
              {event.billingType === "recurring" && event.eventType !== "renewal" && event.subscriptionId && (
                <span className="rounded border border-violet-600/40 bg-violet-600/15 px-1.5 py-0.5 text-[9px] font-semibold text-violet-300 shrink-0">
                  {t("recurringBadge")}
                </span>
              )}
              {event.possibleDuplicate && (
                <span
                  title={t("possibleDuplicate")}
                  className="flex items-center gap-0.5 rounded border border-amber-600/40 bg-amber-600/10 px-1 py-0.5 text-[9px] font-semibold text-amber-400 shrink-0"
                >
                  <IconAlertCircle size={9} />
                  {t("dupBadge")}
                </span>
              )}
              {event.isRetry && (
                <span
                  title={t("retryTooltip")}
                  className="flex items-center gap-0.5 rounded border border-sky-600/40 bg-sky-600/10 px-1 py-0.5 text-[9px] font-semibold text-sky-400 shrink-0"
                >
                  <IconRepeat size={9} />
                  {t("retryBadgeMobile")}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="text-[10px] font-mono text-zinc-400">
                {formatDate(event.createdAt, timezone)}
              </span>
              <span className="text-[9px] text-zinc-600">
                {dayjs(event.createdAt).locale(dayjsLocale).fromNow()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {formatEventValue(event) != null && (
              <span className="font-mono font-semibold text-emerald-400">
                {formatEventValue(event)}
              </span>
            )}
            {event.source && <span className="text-zinc-500">{event.source}</span>}
            {event.productName && (
              <span className="text-zinc-400 truncate max-w-[140px]">{event.productName}</span>
            )}
            {event.device && <span className="text-zinc-600 font-mono">{event.device}</span>}
          </div>
          {event.customerId && (
            <Link
              href={`/${slug}/customers/${event.customerId}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 mt-1 group/cust"
            >
              <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-semibold",
                event.customerName ? "bg-violet-500/15 text-violet-400" : "bg-zinc-800 text-zinc-600"
              )}>
                {event.customerName ? event.customerName.charAt(0).toUpperCase() : <IconUser size={10} />}
              </div>
              <span className="text-[11px] text-zinc-500 truncate max-w-[180px] group-hover/cust:text-violet-400 transition-colors">
                {isSensitive
                  ? maskName(event.customerName ?? event.customerId)
                  : (event.customerName ?? event.customerId.slice(0, 20) + "…")}
              </span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {details && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <IconDots size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            {deleteMutation.isPending ? (
              <IconLoader2 size={13} className="animate-spin" />
            ) : (
              <IconTrash size={13} />
            )}
          </button>
        </div>
      </div>
      {expanded && details && (
        <div className="mt-2.5 pt-2.5 border-t border-zinc-800/40 ml-6">
          <EventDetailGrid event={event} organizationId={organizationId} />
        </div>
      )}
    </div>
  );
}

function EventRow({
  event,
  organizationId,
  timezone,
  slug,
  isSelected,
  onToggle,
}: {
  event: IEvent;
  organizationId: string;
  timezone: string;
  slug: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  const t = useTranslations("events.eventsTable");
  const locale = useLocale();
  const dayjsLocale = locale === "pt" ? "pt-br" : locale;
  const [expanded, setExpanded] = useState(false);
  const deleteMutation = useDeleteEvent();
  const details = hasEventDetails(event);
  const { isSensitive, maskName } = useSensitiveMode();

  const handleDelete = async () => {
    try {
      const result = await deleteMutation.mutateAsync({ id: event.id, organizationId });
      if (!result || (Array.isArray(result) && result.length === 0)) {
        toast.error(t("deleteEventError"));
        return;
      }
      toast.success(t("eventDeleted"));
    } catch {
      toast.error(t("deleteEventError"));
    }
  };

  return (
    <>
      <tr
        className={cn(
          "border-b border-zinc-800/60 transition-colors group/row",
          isSelected ? "bg-indigo-950/20" : "hover:bg-zinc-900/40"
        )}
      >
        <td className="px-3 py-2.5 w-8">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(event.id)}
            onClick={(e) => e.stopPropagation()}
            className="accent-indigo-500 h-3.5 w-3.5 cursor-pointer"
          />
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className={cn(
                "text-zinc-600 hover:text-zinc-300 transition-colors shrink-0",
                !details && "invisible"
              )}
            >
              {expanded ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
            </button>
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] font-mono font-semibold",
                getEventTypeBadgeClass(event.eventType)
              )}
            >
              {event.eventType}
            </span>
            {event.eventType === "renewal" && (
              <span className="rounded border border-sky-600/40 bg-sky-600/15 px-1.5 py-0.5 text-[9px] font-semibold text-sky-300">
                {t("renewalBadge")}
              </span>
            )}
            {event.billingType === "recurring" && event.eventType !== "renewal" && event.subscriptionId && (
              <span className="rounded border border-violet-600/40 bg-violet-600/15 px-1.5 py-0.5 text-[9px] font-semibold text-violet-300">
                {t("recurringBadge")}
              </span>
            )}
            {event.provider && (
              <span className="rounded border border-zinc-700/60 bg-zinc-800/60 px-1.5 py-0.5 text-[9px] font-mono text-zinc-500">
                {event.provider}
              </span>
            )}
            {event.possibleDuplicate && (
              <span
                title={t("possibleDuplicateDetail")}
                className="flex items-center gap-1 rounded border border-amber-600/40 bg-amber-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400"
              >
                <IconAlertCircle size={10} />
                {t("duplicateBadge")}
              </span>
            )}
            {event.isRetry && (
              <span
                title={t("retryTooltip")}
                className="flex items-center gap-1 rounded border border-sky-600/40 bg-sky-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400"
              >
                <IconRepeat size={10} />
                {t("retryBadge")}
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2.5 text-right">
          {formatEventValue(event) != null ? (
            <span className="text-xs font-mono font-semibold text-emerald-400">
              {formatEventValue(event)}
            </span>
          ) : (
            <span className="text-xs text-zinc-700">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 max-w-[160px]">
          {event.customerId ? (
            <Link
              href={`/${slug}/customers/${event.customerId}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 group/cust min-w-0"
            >
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold",
                event.customerName ? "bg-violet-500/15 text-violet-400" : "bg-zinc-800 text-zinc-600"
              )}>
                {event.customerName ? event.customerName.charAt(0).toUpperCase() : <IconUser size={11} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-zinc-300 truncate group-hover/cust:text-violet-300 transition-colors">
                  {isSensitive
                    ? maskName(event.customerName ?? event.customerId)
                    : (event.customerName ?? <span className="font-mono text-zinc-600">{event.customerId.slice(0, 10)}…</span>)}
                </p>
              </div>
            </Link>
          ) : (
            <span className="text-xs text-zinc-700">—</span>
          )}
        </td>
        <td className="px-3 py-2.5">
          <span className="text-xs text-zinc-400">
            {event.source ?? <span className="text-zinc-700">—</span>}
          </span>
        </td>
        <td className="px-3 py-2.5 max-w-[160px]">
          {event.productName ? (
            <span className="text-xs text-zinc-300 truncate block">{event.productName}</span>
          ) : (
            <span className="text-xs text-zinc-700">—</span>
          )}
        </td>
        <td className="px-3 py-2.5">
          {event.device ? (
            <span className="text-xs text-zinc-500 font-mono">{event.device}</span>
          ) : (
            <span className="text-xs text-zinc-700">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-mono text-zinc-300">
              {formatDate(event.createdAt, timezone)}
            </span>
            <span className="text-[10px] text-zinc-600">
              {dayjs(event.createdAt).locale(dayjsLocale).fromNow()}
            </span>
          </div>
        </td>
        <td className="px-3 py-2.5 w-10">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors disabled:opacity-40 opacity-0 group-hover/row:opacity-100"
            title={t("deleteEvent")}
          >
            {deleteMutation.isPending ? (
              <IconLoader2 size={13} className="animate-spin" />
            ) : (
              <IconTrash size={13} />
            )}
          </button>
        </td>
      </tr>
      {expanded && details && (
        <tr className="border-b border-zinc-800/60 bg-zinc-950/60">
          <td colSpan={9} className="px-4 py-3">
            <div className="pl-5">
              <EventDetailGrid event={event} organizationId={organizationId} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface EventsTableProps {
  organizationId: string;
  data: IEvent[];
  pagination: IPaginationMeta;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function EventsTable({
  organizationId,
  data,
  pagination,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: EventsTableProps) {
  const t = useTranslations("events.eventsTable");
  const { organization } = useOrganization();
  const timezone = organization?.timezone ?? "America/Sao_Paulo";
  const slug = organization?.slug ?? "";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const batchDeleteMutation = useDeleteEventsBatch();

  const toggleSelect = (id: string) => {
    setConfirmDelete(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setConfirmDelete(false);
    if (selectedIds.size === data.length && data.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((e) => e.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    await batchDeleteMutation.mutateAsync({
      ids: Array.from(selectedIds),
      organizationId,
    });
    setSelectedIds(new Set());
    setConfirmDelete(false);
    toast.success(t("batchDeleted", { count }));
  };

  const allSelected = data.length > 0 && selectedIds.size === data.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const paginationStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const paginationEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  const selectionBar = selectedIds.size > 0 && (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/60">
      <div className="flex items-center gap-3 min-w-0">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <IconAlertTriangle size={13} className="text-red-400 shrink-0" />
            <span className="text-xs text-red-300 font-medium whitespace-nowrap">
              {t("selection.deleteConfirm", { count: selectedIds.size })}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-zinc-400 font-medium tabular-nums">
              {t("selection.selectedOf", { selected: selectedIds.size, total: data.length })}
            </span>
            <button
              type="button"
              onClick={() => { setSelectedIds(new Set()); setConfirmDelete(false); }}
              className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-0.5"
            >
              <IconX size={10} />
              {t("selection.deselect")}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {confirmDelete ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
              className="h-7 px-3 text-xs text-zinc-400 hover:text-zinc-100"
            >
              {t("selection.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleBatchDelete}
              disabled={batchDeleteMutation.isPending}
              className="h-7 gap-1.5 text-xs bg-red-700 hover:bg-red-600 text-white"
            >
              {batchDeleteMutation.isPending ? (
                <IconLoader2 size={12} className="animate-spin" />
              ) : (
                <IconTrash size={12} />
              )}
              {t("selection.confirm")}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            className="h-7 gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-900/40"
          >
            <IconTrash size={12} />
            {t("selection.delete")}
          </Button>
        )}
      </div>
    </div>
  );

  const paginationBar = pagination.total > 0 && (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 hidden sm:inline">{t("pagination.rowsPerPage")}</span>
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
          {t("pagination.rangeOf", { start: paginationStart, end: paginationEnd, total: pagination.total })}
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
      {selectionBar}

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="px-3 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className="accent-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("columnType")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 text-right">
                {t("columnValue")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("columnCustomer")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("columnChannel")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("columnProduct")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("columnDevice")}
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("columnWhen")}
              </th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-800/40">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <Skeleton className="h-4 w-full rounded bg-zinc-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-600">
                  {t("emptyState")}
                </td>
              </tr>
            ) : (
              data.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  organizationId={organizationId}
                  timezone={timezone}
                  slug={slug}
                  isSelected={selectedIds.has(event.id)}
                  onToggle={toggleSelect}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-b border-zinc-800/40 px-3 py-3.5 space-y-2">
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
            {t("emptyState")}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/80">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                className="accent-indigo-500 h-3.5 w-3.5 cursor-pointer"
              />
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">
                {t("selectAll")}
              </span>
            </div>
            {data.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                organizationId={organizationId}
                timezone={timezone}
                slug={slug}
                isSelected={selectedIds.has(event.id)}
                onToggle={toggleSelect}
              />
            ))}
          </>
        )}
      </div>

      {paginationBar}
    </div>
  );
}
