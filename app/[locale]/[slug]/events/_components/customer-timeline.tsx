"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconChevronRight, IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { fmtCurrencyDecimal } from "@/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerEvents } from "@/hooks/queries/use-customer-events";
import { useOrganization } from "@/components/providers/organization-provider";
import { formatDate } from "@/utils/format-date";
import { getEventTypeBadgeClass } from "./events-filters";
import { DetailField } from "./event-detail-field";
import type { ICustomerEvent } from "@/interfaces/event.interface";

function formatEventValue(event: ICustomerEvent): string | null {
  const cents = event.baseGrossValueInCents ?? event.grossValueInCents;
  if (cents == null) return null;
  const currency = event.baseCurrency ?? "BRL";
  const locale = currency === "BRL" ? "pt-BR" : "en-US";
  return fmtCurrencyDecimal(cents / 100, locale, currency);
}

function CustomerEventDetails({ event }: { event: ICustomerEvent }) {
  const fields = [
    event.source && { label: "source", value: event.source },
    event.medium && { label: "medium", value: event.medium },
    event.campaign && { label: "campaign", value: event.campaign },
    event.device && { label: "device", value: event.device },
    event.category && { label: "category", value: event.category },
    event.paymentMethod && { label: "payment_method", value: event.paymentMethod },
    event.productId && { label: "product_id", value: event.productId, mono: true },
    event.sessionId && { label: "session_id", value: event.sessionId, mono: true, copyable: true },
    event.landingPage && { label: "landing_page", value: event.landingPage, mono: true },
    event.eventHash && { label: "event_hash", value: event.eventHash, mono: true, copyable: true },
  ].filter(Boolean) as { label: string; value: string; mono?: boolean; copyable?: boolean }[];

  if (fields.length === 0) return null;

  return (
    <div className="mt-1.5 rounded-md border border-zinc-800/50 bg-zinc-900/40 divide-y divide-zinc-800/30 overflow-hidden">
      {fields.map((f) => (
        <DetailField key={f.label} {...f} />
      ))}
    </div>
  );
}

interface SessionGroup {
  sessionId: string | null;
  label: string;
  events: ICustomerEvent[];
}

function groupBySession(
  events: ICustomerEvent[],
  tz: string,
  formatSessionLabel: (date: string) => string,
  noSessionLabel: string
): SessionGroup[] {
  const groups: SessionGroup[] = [];
  const seen = new Map<string, SessionGroup>();

  for (const event of events) {
    const key = event.sessionId ?? "__no_session__";
    if (!seen.has(key)) {
      const firstEvent = event;
      const label = event.sessionId
        ? formatSessionLabel(formatDate(firstEvent.createdAt, tz, "DD/MM HH:mm"))
        : noSessionLabel;
      const group: SessionGroup = { sessionId: event.sessionId, label, events: [] };
      seen.set(key, group);
      groups.push(group);
    }
    seen.get(key)!.events.push(event);
  }

  return groups;
}

interface CustomerTimelineProps {
  organizationId: string;
  customerId: string;
  currentEventId: string;
}

export function CustomerTimeline({
  organizationId,
  customerId,
  currentEventId,
}: CustomerTimelineProps) {
  const t = useTranslations("customerTimeline");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { organization } = useOrganization();
  const tz = organization?.timezone ?? "America/Sao_Paulo";
  const { data, isLoading } = useCustomerEvents(organizationId, customerId);

  if (isLoading) {
    return (
      <div className="mt-3 space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-32" />
            {[0, 1].map((j) => (
              <div key={j} className="flex items-start gap-3 ml-2">
                <Skeleton className="h-2 w-2 rounded-full mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="mt-3 text-xs text-zinc-600 italic">
        {t("emptyState")}
      </p>
    );
  }

  const groups = groupBySession(
    data,
    tz,
    (date) => t("sessionOf", { date }),
    t("noSession")
  );

  return (
    <div className="mt-3">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600 mb-2.5">
        {t("title", {
          eventCount: data.length,
          sessionCount: groups.length,
          sessionLabel: groups.length === 1 ? t("sessionLabel") : t("sessionsLabel"),
        })}
      </p>
      <div className="space-y-4">
        {groups.map((group, groupIndex) => (
          <div key={group.sessionId ?? groupIndex}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-violet-500/70">
                {group.label}
              </span>
              <span className="flex-1 h-px bg-violet-800/20" />
              <span className="text-[9px] text-zinc-700">{t("eventsCount", { count: group.events.length })}</span>
            </div>
            <ol className="relative ml-1">
              {group.events.map((event, index) => {
                const isCurrent = event.id === currentEventId;
                const isLast = index === group.events.length - 1;
                const isExpanded = expandedId === event.id;
                const value = formatEventValue(event);

                return (
                  <li key={event.id} className="flex items-start gap-3 relative">
                    <div className="flex flex-col items-center shrink-0 mt-0.5 w-3">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full border shrink-0",
                          isCurrent
                            ? "bg-violet-400 border-violet-400 ring-2 ring-violet-400/30"
                            : "bg-zinc-800 border-zinc-600"
                        )}
                      />
                      {!isLast && (
                        <span className="w-px flex-1 bg-zinc-800 mt-1 min-h-[20px]" />
                      )}
                    </div>
                    <div className="flex-1 pb-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : event.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-semibold shrink-0",
                              getEventTypeBadgeClass(event.eventType)
                            )}
                          >
                            {event.eventType}
                          </span>
                          {isCurrent && (
                            <span className="rounded border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-violet-400 shrink-0">
                              {t("currentBadge")}
                            </span>
                          )}
                          {value && (
                            <span className="text-[10px] font-mono font-semibold text-emerald-400 shrink-0">
                              {value}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-zinc-600 shrink-0">
                            {formatDate(event.createdAt, tz, "DD/MM HH:mm:ss")}
                          </span>
                          <span className="ml-auto shrink-0 text-zinc-700">
                            {isExpanded ? (
                              <IconChevronDown size={10} />
                            ) : (
                              <IconChevronRight size={10} />
                            )}
                          </span>
                        </div>
                        {!isExpanded && (event.productName || event.landingPage) && (
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {event.productName && (
                              <span className="text-[10px] text-zinc-500 truncate max-w-[180px]">
                                {event.productName}
                              </span>
                            )}
                            {event.landingPage && (
                              <span className="text-[10px] text-zinc-700 font-mono truncate max-w-[180px]">
                                {event.landingPage}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                      {isExpanded && <CustomerEventDetails event={event} />}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
