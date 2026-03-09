"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { useTopCustomers } from "@/hooks/queries/use-top-customers";
import type { TopCustomerSortBy } from "@/actions/customers/get-top-customers.action";
import { fmtBRL } from "@/utils/format";
import {
  IconTrophy,
  IconUser,
  IconArrowNarrowRight,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MEDAL_COLORS = [
  "text-yellow-400",
  "text-zinc-300",
  "text-amber-600",
];

export function TopCustomersRanking() {
  const t = useTranslations("customers");
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const slug = organization?.slug ?? "";

  const [sortBy, setSortBy] = useState<TopCustomerSortBy>("ltv");

  const { data: customers = [], isLoading } = useTopCustomers(orgId, { limit: 50, sortBy });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-zinc-100">{t("topCustomers.title")}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{t("topCustomers.subtitle")}</p>
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as TopCustomerSortBy)}>
          <SelectTrigger className="h-8 w-44 bg-zinc-900 border-zinc-700 text-zinc-300 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="ltv" className="text-zinc-300 focus:bg-zinc-800 text-xs">
              {t("topCustomers.sortLtv")}
            </SelectItem>
            <SelectItem value="payments" className="text-zinc-300 focus:bg-zinc-800 text-xs">
              {t("topCustomers.sortPayments")}
            </SelectItem>
            <SelectItem value="lastSeen" className="text-zinc-300 focus:bg-zinc-800 text-xs">
              {t("topCustomers.sortLastSeen")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[40px_1fr_120px_90px_160px] px-4 py-2 border-b border-zinc-800/60 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          <span>{t("topCustomers.rank")}</span>
          <span>{t("table.customer")}</span>
          <span>{t("topCustomers.ltv")}</span>
          <span>{t("topCustomers.payments")}</span>
          <span>{t("topCustomers.source")}</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-zinc-800/40">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-6 w-6 rounded shrink-0" />
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <IconTrophy size={32} className="text-zinc-700 mb-3" />
            <p className="text-sm font-medium text-zinc-400">{t("topCustomers.empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {customers.map((customer, idx) => (
              <Link
                key={customer.customerId}
                href={`/${slug}/customers/${customer.customerId}`}
                className="flex sm:grid sm:grid-cols-[40px_1fr_120px_90px_160px] items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors group"
              >
                <div className="flex items-center justify-center w-6">
                  {idx < 3 ? (
                    <IconTrophy size={14} className={cn("shrink-0", MEDAL_COLORS[idx])} />
                  ) : (
                    <span className="text-xs font-mono text-zinc-600">{idx + 1}</span>
                  )}
                </div>

                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
                    customer.name ? "bg-violet-500/15 text-violet-400" : "bg-zinc-800 text-zinc-600"
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

                <span className="hidden sm:block text-xs font-semibold text-emerald-400">
                  {fmtBRL(customer.ltvInCents / 100)}
                </span>

                <span className="hidden sm:block text-xs text-zinc-400 text-center">
                  {customer.paymentsCount}
                </span>

                <div className="hidden sm:flex items-center justify-between gap-1">
                  <span className="text-xs text-zinc-500 truncate">
                    {[customer.firstSource, customer.firstCampaign]
                      .filter(Boolean)
                      .join(" / ") || "—"}
                  </span>
                  <IconArrowNarrowRight size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
