"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { useTopCustomers } from "@/hooks/queries/use-top-customers";
import { fmtBRL } from "@/utils/format";
import { IconUser, IconUsers, IconArrowRight } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSensitiveMode } from "@/hooks/use-sensitive-mode";

export function TopCustomersCard() {
  const t = useTranslations("dashboard.topCustomers");
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const slug = organization?.slug ?? "";

  const { data: customers, isLoading } = useTopCustomers(orgId, { limit: 5 });
  const { isSensitive, maskName, maskEmail } = useSensitiveMode();

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">{t("title")}</h2>
          <p className="text-[10px] text-zinc-600 mt-0.5">{t("subtitle")}</p>
        </div>
        <Link
          href={`/${slug}/customers?tab=top`}
          className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {t("viewAll")}
          <IconArrowRight size={11} />
        </Link>
      </div>

      <div className="divide-y divide-zinc-800/40">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <Skeleton className="h-7 w-7 rounded-full shrink-0 bg-zinc-800" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32 bg-zinc-800" />
                <Skeleton className="h-2.5 w-20 bg-zinc-800" />
              </div>
              <Skeleton className="h-3 w-16 bg-zinc-800" />
            </div>
          ))
        ) : !customers || customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <IconUsers size={24} className="text-zinc-700 mb-2" />
            <p className="text-xs text-zinc-600">{t("empty")}</p>
          </div>
        ) : (
          customers.map((customer, index) => (
            <Link
              key={customer.customerId}
              href={`/${slug}/customers/${customer.customerId}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/30 transition-colors group"
            >
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold",
                customer.name ? "bg-violet-500/15 text-violet-400" : "bg-zinc-800 text-zinc-600"
              )}>
                {customer.name ? customer.name.charAt(0).toUpperCase() : <IconUser size={13} />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-zinc-100 transition-colors">
                  {isSensitive
                    ? maskName(customer.name ?? customer.email ?? customer.customerId)
                    : (customer.name ?? customer.email ?? customer.customerId.slice(0, 20) + "…")}
                </p>
                {(customer.name && customer.email) && (
                  <p className="text-[10px] text-zinc-600 truncate">
                    {isSensitive ? maskEmail(customer.email) : customer.email}
                  </p>
                )}
                {!customer.name && !customer.email && (
                  <p className="text-[10px] text-zinc-700 font-mono truncate">{customer.customerId.slice(0, 16)}…</p>
                )}
              </div>

              <div className="flex flex-col items-end shrink-0 gap-0.5">
                {customer.ltvInCents > 0 ? (
                  <span className="text-xs font-mono font-semibold text-emerald-400">
                    {fmtBRL(customer.ltvInCents / 100)}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-700">{t("noPayments")}</span>
                )}
                {customer.paymentsCount > 0 && (
                  <span className="text-[9px] text-zinc-600">
                    {customer.paymentsCount} {t("payments").toLowerCase()}
                  </span>
                )}
                <span className="text-[9px] font-bold text-zinc-700">
                  #{index + 1}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
