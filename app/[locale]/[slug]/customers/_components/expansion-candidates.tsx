"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { useExpansionCandidates } from "@/hooks/queries/use-expansion-candidates";
import { fmtCurrency } from "@/utils/format";
import {
  IconRocket,
  IconUser,
  IconArrowNarrowRight,
  IconMail,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSensitiveMode } from "@/hooks/use-sensitive-mode";

export function ExpansionCandidates() {
  const t = useTranslations("customers");
  const { organization } = useOrganization();
  const orgId = organization?.id ?? "";
  const slug = organization?.slug ?? "";
  const locale = organization?.locale ?? "pt-BR";
  const currency = organization?.currency ?? "BRL";

  const [minLtvCents, setMinLtvCents] = useState(120000);
  const [minTenureMonths, setMinTenureMonths] = useState(6);

  const { data: candidates = [], isLoading } = useExpansionCandidates(orgId, {
    minLtvCents,
    minTenureMonths,
  });
  const { isSensitive, maskName, maskEmail } = useSensitiveMode();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-zinc-100">{t("expansion.title")}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t("expansion.subtitle", { months: minTenureMonths })}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">{t("expansion.minLtv")}</span>
            {[60000, 120000, 300000, 600000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setMinLtvCents(v)}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-medium transition-colors",
                  minLtvCents === v
                    ? "bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-600/30"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
                )}
              >
                {fmtCurrency(v / 100, locale, currency)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">{t("expansion.minTenure")}</span>
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinTenureMonths(m)}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-medium transition-colors",
                  minTenureMonths === m
                    ? "bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-600/30"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
                )}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_150px_100px_100px_100px] px-4 py-2 border-b border-zinc-800/60 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          <span>{t("table.customer")}</span>
          <span>{t("expansion.plan")}</span>
          <span>{t("expansion.ltv")}</span>
          <span>{t("expansion.tenureLabel")}</span>
          <span></span>
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
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <IconRocket size={32} className="text-zinc-700 mb-3" />
            <p className="text-sm font-medium text-zinc-400">{t("expansion.empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {candidates.map((candidate) => (
              <div
                key={candidate.customerId}
                className="flex sm:grid sm:grid-cols-[1fr_150px_100px_100px_100px] items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors group"
              >
                <Link
                  href={`/${slug}/customers/${candidate.customerId}`}
                  className="flex items-center gap-3 min-w-0"
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
                    candidate.name ? "bg-indigo-500/15 text-indigo-400" : "bg-zinc-800 text-zinc-600"
                  )}>
                    {candidate.name ? candidate.name.charAt(0).toUpperCase() : <IconUser size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-zinc-100">
                      {candidate.name
                        ? (isSensitive ? maskName(candidate.name) : candidate.name)
                        : <span className="text-zinc-500 italic">{t("empty.title")}</span>}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {candidate.email
                        ? (isSensitive ? maskEmail(candidate.email) : candidate.email)
                        : (
                          <span className="font-mono text-zinc-700">{candidate.customerId.slice(0, 20)}…</span>
                        )}
                    </p>
                  </div>
                </Link>

                <span className="hidden sm:block text-xs text-zinc-400 truncate">{candidate.planName}</span>

                <span className="hidden sm:block text-xs font-semibold text-emerald-400">
                  {fmtCurrency(candidate.ltvInCents / 100, locale, currency)}
                </span>

                <span className="hidden sm:block text-xs text-zinc-400">
                  {t("expansion.tenure", { months: candidate.tenureMonths })}
                </span>

                <div className="hidden sm:flex items-center justify-end gap-2">
                  {candidate.email && (
                    <a
                      href={`mailto:${candidate.email}?subject=Upgrade para plano superior`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium bg-indigo-600/15 text-indigo-300 ring-1 ring-indigo-600/20 hover:bg-indigo-600/25 transition-colors"
                    >
                      <IconMail size={11} />
                      {t("expansion.suggestUpgrade")}
                    </a>
                  )}
                  <Link
                    href={`/${slug}/customers/${candidate.customerId}`}
                    className="text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    <IconArrowNarrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
