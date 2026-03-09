"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { useCustomerCohorts } from "@/hooks/queries/use-customer-cohorts";
import { fmtBRL } from "@/utils/format";
import {
  IconUsers,
  IconChevronDown,
  IconChevronUp,
  IconUserCheck,
  IconUserX,
  IconShoppingBag,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import type { ICohortCustomer } from "@/actions/customers/get-customer-cohorts.action";

const STATUS_STYLES: Record<ICohortCustomer["status"], { avatar: string; badge: string; label: (t: (k: string) => string) => string }> = {
  subscriber: {
    avatar: "bg-emerald-500/15 text-emerald-400",
    badge: "bg-emerald-900/30 text-emerald-400",
    label: (t) => t("cohorts.subscriber"),
  },
  buyer: {
    avatar: "bg-sky-500/15 text-sky-400",
    badge: "bg-sky-900/30 text-sky-400",
    label: (t) => t("cohorts.buyer"),
  },
  churned: {
    avatar: "bg-zinc-800 text-zinc-600",
    badge: "bg-rose-900/30 text-rose-400",
    label: (t) => t("cohorts.churned"),
  },
};

export function CustomerCohorts() {
  const t = useTranslations("customers");
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const slug = organization?.slug ?? "";

  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const { data, isLoading } = useCustomerCohorts(orgId, {
    expandMonth: expandedMonth ?? undefined,
  });

  const cohorts = data?.cohorts ?? [];
  const maxTotal = Math.max(...cohorts.map((c) => c.totalCustomers), 1);

  const toggleMonth = (month: string) => {
    setExpandedMonth((prev) => (prev === month ? null : month));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-zinc-100">{t("cohorts.title")}</h2>
        <p className="text-xs text-zinc-500 mt-0.5">{t("cohorts.subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-zinc-800 rounded-lg" />
          ))}
        </div>
      ) : cohorts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <IconUsers size={32} className="text-zinc-700 mb-3" />
          <p className="text-sm font-medium text-zinc-400">{t("cohorts.empty")}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {cohorts.map((cohort) => {
            const subscriberRate =
              cohort.totalCustomers > 0
                ? Math.round((cohort.subscriberCount / cohort.totalCustomers) * 100)
                : 0;
            const buyerRate =
              cohort.totalCustomers > 0
                ? Math.round((cohort.buyerCount / cohort.totalCustomers) * 100)
                : 0;
            const barWidth = Math.max((cohort.totalCustomers / maxTotal) * 100, 4);
            const isExpanded = expandedMonth === cohort.month;
            const expandedCustomers = isExpanded ? (data?.expandedCustomers ?? []) : [];
            const monthLabel = dayjs(`${cohort.month}-01`).format("MMM/YYYY");

            return (
              <div key={cohort.month} className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleMonth(cohort.month)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-zinc-800/30 transition-colors text-left"
                >
                  <div className="w-20 shrink-0">
                    <span className="text-xs font-semibold text-zinc-300">{monthLabel}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="h-1.5 rounded-full bg-zinc-800 relative overflow-hidden flex"
                        style={{ width: `${barWidth}%`, minWidth: "4%" }}
                      >
                        <div
                          className="h-full bg-emerald-500/70 transition-all"
                          style={{ width: `${subscriberRate}%` }}
                        />
                        <div
                          className="h-full bg-sky-500/60 transition-all"
                          style={{ width: `${buyerRate}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400 shrink-0">
                        {subscriberRate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-600 flex-wrap">
                      <span className="flex items-center gap-0.5">
                        <IconUsers size={9} />
                        {cohort.totalCustomers}
                      </span>
                      {cohort.subscriberCount > 0 && (
                        <span className="flex items-center gap-0.5 text-emerald-600">
                          <IconUserCheck size={9} />
                          {cohort.subscriberCount} {t("cohorts.subscriber").toLowerCase()}
                        </span>
                      )}
                      {cohort.buyerCount > 0 && (
                        <span className="flex items-center gap-0.5 text-sky-600">
                          <IconShoppingBag size={9} />
                          {cohort.buyerCount} {t("cohorts.buyer").toLowerCase()}
                        </span>
                      )}
                      {cohort.churnedCount > 0 && (
                        <span className="flex items-center gap-0.5 text-rose-600">
                          <IconUserX size={9} />
                          {cohort.churnedCount} {t("cohorts.churned").toLowerCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:block shrink-0 text-right">
                    <span className="text-xs font-medium text-zinc-300">
                      {fmtBRL(cohort.totalLtvInCents / 100)}
                    </span>
                  </div>

                  <div className="shrink-0 text-zinc-500">
                    {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-zinc-800/60">
                    <div className="px-4 py-2 bg-zinc-900/50">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                        {t("cohorts.expandedTitle", { month: monthLabel })}
                      </p>
                    </div>
                    <div className="divide-y divide-zinc-800/30 max-h-80 overflow-y-auto">
                      {expandedCustomers.map((c) => {
                        const styles = STATUS_STYLES[c.status];
                        return (
                          <Link
                            key={c.customerId}
                            href={`/${slug}/customers/${c.customerId}`}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/30 transition-colors group"
                          >
                            <div className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold",
                              styles.avatar
                            )}>
                              {c.name ? c.name.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-zinc-300 truncate group-hover:text-zinc-100">
                                {c.name ?? c.email ?? c.customerId.slice(0, 20) + "…"}
                              </p>
                              {c.name && c.email && (
                                <p className="text-[10px] text-zinc-600 truncate">{c.email}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", styles.badge)}>
                                {styles.label(t)}
                              </span>
                              {c.ltvInCents > 0 && (
                                <span className="text-[10px] text-zinc-500">
                                  {fmtBRL(c.ltvInCents / 100)}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
