"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import {
  IconTrash,
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconLoader2,
  IconDots,
  IconCopy,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconAlertCircle,
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
import type { IEvent } from "@/interfaces/event.interface";
import type { IPaginationMeta } from "@/interfaces/dashboard.interface";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

function CopyButton({ value }: { value: string }) {
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
      title="Copiar"
    >
      {copied ? (
        <IconCheck size={11} className="text-emerald-400" />
      ) : (
        <IconCopy size={11} />
      )}
    </button>
  );
}

interface DetailFieldProps {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  dim?: boolean;
}

function DetailField({ label, value, mono = false, copyable = false, dim = false }: DetailFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600 shrink-0 w-[100px]">
        {label}
      </span>
      <div className="flex items-center gap-0 flex-1 min-w-0 justify-end">
        <span
          className={cn(
            "text-xs truncate",
            mono ? "font-mono" : "",
            dim ? "text-zinc-700" : "text-zinc-300"
          )}
          title={value}
        >
          {value}
        </span>
        {copyable && <CopyButton value={value} />}
      </div>
    </div>
  );
}

function EventDetailGrid({ event }: { event: IEvent }) {
  const fields: DetailFieldProps[] = [];

  if (event.sessionId)
    fields.push({ label: "session_id", value: event.sessionId, mono: true, copyable: true });
  if (event.customerId)
    fields.push({ label: "customer_id", value: event.customerId, mono: true, copyable: true });
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
  fields.push({ label: "event_id", value: event.id, mono: true, copyable: true, dim: true });

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 divide-y divide-zinc-800/40 overflow-hidden">
      {fields.map((f) => (
        <DetailField key={f.label} {...f} />
      ))}
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
  isSelected,
  onToggle,
}: {
  event: IEvent;
  organizationId: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const deleteMutation = useDeleteEvent();
  const details = hasEventDetails(event);

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: event.id, organizationId });
    toast.success("Evento excluído");
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
                  renovação
                </span>
              )}
              {event.billingType === "recurring" && event.eventType !== "renewal" && event.subscriptionId && (
                <span className="rounded border border-violet-600/40 bg-violet-600/15 px-1.5 py-0.5 text-[9px] font-semibold text-violet-300 shrink-0">
                  recorrente
                </span>
              )}
              {event.possibleDuplicate && (
                <span
                  title="Possível duplicata"
                  className="flex items-center gap-0.5 rounded border border-amber-600/40 bg-amber-600/10 px-1 py-0.5 text-[9px] font-semibold text-amber-400 shrink-0"
                >
                  <IconAlertCircle size={9} />
                  dup
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="text-[10px] font-mono text-zinc-400">
                {dayjs(event.createdAt).format("DD/MM/YYYY HH:mm")}
              </span>
              <span className="text-[9px] text-zinc-600">
                {dayjs(event.createdAt).fromNow()}
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
          <EventDetailGrid event={event} />
        </div>
      )}
    </div>
  );
}

function EventRow({
  event,
  organizationId,
  isSelected,
  onToggle,
}: {
  event: IEvent;
  organizationId: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const deleteMutation = useDeleteEvent();
  const details = hasEventDetails(event);

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: event.id, organizationId });
    toast.success("Evento excluído");
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
                renovação
              </span>
            )}
            {event.billingType === "recurring" && event.eventType !== "renewal" && event.subscriptionId && (
              <span className="rounded border border-violet-600/40 bg-violet-600/15 px-1.5 py-0.5 text-[9px] font-semibold text-violet-300">
                recorrente
              </span>
            )}
            {event.provider && (
              <span className="rounded border border-zinc-700/60 bg-zinc-800/60 px-1.5 py-0.5 text-[9px] font-mono text-zinc-500">
                {event.provider}
              </span>
            )}
            {event.possibleDuplicate && (
              <span
                title="Possível duplicata — outro evento idêntico foi detectado em até 10 minutos"
                className="flex items-center gap-1 rounded border border-amber-600/40 bg-amber-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400"
              >
                <IconAlertCircle size={10} />
                duplicata
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
              {dayjs(event.createdAt).format("DD/MM/YYYY HH:mm")}
            </span>
            <span className="text-[10px] text-zinc-600">
              {dayjs(event.createdAt).fromNow()}
            </span>
          </div>
        </td>
        <td className="px-3 py-2.5 w-10">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors disabled:opacity-40 opacity-0 group-hover/row:opacity-100"
            title="Excluir evento"
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
          <td colSpan={8} className="px-4 py-3">
            <div className="pl-5">
              <EventDetailGrid event={event} />
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
    toast.success(`${count} evento(s) excluído(s)`);
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
              Excluir {selectedIds.size} evento{selectedIds.size > 1 ? "s" : ""}?
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-zinc-400 font-medium tabular-nums">
              {selectedIds.size} de {data.length} selecionado{selectedIds.size > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => { setSelectedIds(new Set()); setConfirmDelete(false); }}
              className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-0.5"
            >
              <IconX size={10} />
              Desmarcar
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
              Cancelar
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
              Confirmar
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
            Excluir
          </Button>
        )}
      </div>
    </div>
  );

  const paginationBar = pagination.total > 0 && (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 hidden sm:inline">Linhas por página</span>
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
          {paginationStart}–{paginationEnd} de {pagination.total}
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
                Tipo
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 text-right">
                Valor
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Canal
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Produto
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Device
              </th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Quando
              </th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-800/40">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <Skeleton className="h-4 w-full rounded bg-zinc-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-600">
                  Nenhum evento encontrado para os filtros aplicados
                </td>
              </tr>
            ) : (
              data.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  organizationId={organizationId}
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
            Nenhum evento encontrado para os filtros aplicados
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
                Selecionar todos
              </span>
            </div>
            {data.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                organizationId={organizationId}
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
