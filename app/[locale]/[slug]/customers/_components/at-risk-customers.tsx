"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { useAtRiskCustomers } from "@/hooks/queries/use-at-risk-customers";
import { fmtBRL } from "@/utils/format";
import { formatDate } from "@/utils/format-date";
import {
  IconAlertTriangle,
  IconUser,
  IconArrowNarrowRight,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AtRiskCustomers() {
  const t = useTranslations("customers");
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const slug = organization?.slug ?? "";
  const timezone = organization?.timezone ?? "America/Sao_Paulo";

  const [daysThreshold, setDaysThreshold] = useState(30);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: customers = [], isLoading } = useAtRiskCustomers(orgId, { daysThreshold });

  const total = customers.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = customers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-zinc-100">{t("atRisk.title")}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t("atRisk.subtitle", { days: daysThreshold })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">{t("atRisk.threshold")}</span>
          {[14, 30, 60, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setDaysThreshold(d); setPage(1); }}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                daysThreshold === d
                  ? "bg-rose-600/20 text-rose-300 ring-1 ring-rose-600/30"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
              )}
            >
              {d}{t("atRisk.thresholdShort")}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_160px_100px_110px_100px] px-4 py-2 border-b border-zinc-800/60 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          <span>{t("table.customer")}</span>
          <span>{t("atRisk.plan")}</span>
          <span>{t("atRisk.value")}</span>
          <span>{t("atRisk.lastSeen")}</span>
          <span>{t("atRisk.daysLabel")}</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-zinc-800/40">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <IconAlertTriangle size={32} className="text-zinc-700 mb-3" />
            <p className="text-sm font-medium text-zinc-400">{t("atRisk.empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {paginated.map((customer) => (
              <Link
                key={customer.customerId}
                href={`/${slug}/customers/${customer.customerId}`}
                className="flex sm:grid sm:grid-cols-[1fr_160px_100px_110px_100px] items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
                    customer.name ? "bg-rose-500/15 text-rose-400" : "bg-zinc-800 text-zinc-600"
                  )}>
                    {customer.name ? customer.name.charAt(0).toUpperCase() : <IconUser size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-zinc-100">
                      {customer.name ?? <span className="text-zinc-500 italic">{t("empty.title")}</span>}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {customer.email ?? (
                        <span className="font-mono text-zinc-700">{customer.customerId.slice(0, 20)}…</span>
                      )}
                    </p>
                  </div>
                </div>

                <span className="hidden sm:block text-xs text-zinc-400 truncate">{customer.planName}</span>

                <span className="hidden sm:block text-xs font-medium text-zinc-300">
                  {fmtBRL(customer.valueInCents / 100)}
                </span>

                <span className="hidden sm:block text-xs text-zinc-500">
                  {formatDate(customer.lastSeenAt, timezone, "DD/MM/YY")}
                </span>

                <div className="hidden sm:flex items-center justify-between gap-1">
                  <span className={cn(
                    "text-xs font-semibold",
                    customer.daysInactive > 60 ? "text-rose-400" : customer.daysInactive > 30 ? "text-amber-400" : "text-zinc-400"
                  )}>
                    {t("atRisk.daysInactive", { days: customer.daysInactive })}
                  </span>
                  <IconArrowNarrowRight size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-600">{total} clientes</p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <IconChevronLeft size={16} />
            </button>
            <span className="text-xs text-zinc-500 px-2">{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
