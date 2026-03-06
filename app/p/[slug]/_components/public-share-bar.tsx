"use client";

import { useState, useCallback } from "react";
import { IconBrandX, IconLink, IconCheck, IconShare2 } from "@tabler/icons-react";
import type { IPublicOrgData, IPublicMetrics } from "@/interfaces/public-page.interface";

interface PublicShareBarProps {
  org: IPublicOrgData;
  metrics: IPublicMetrics;
  month: string;
}

function fmtCurrency(value: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function buildTweetText(org: IPublicOrgData, metrics: IPublicMetrics, month: string): string {
  const lines: string[] = [`${month} — ${org.name}`, ""];

  if (metrics.mrr !== null && metrics.mrr !== undefined) {
    const mrrStr =
      typeof metrics.mrr.value === "number"
        ? fmtCurrency(metrics.mrr.value, org.locale, org.currency)
        : String(metrics.mrr.value);

    const growth =
      metrics.mrrGrowthRate !== null && metrics.mrrGrowthRate !== undefined
        ? ` (${metrics.mrrGrowthRate > 0 ? "+" : ""}${metrics.mrrGrowthRate.toFixed(1)}%)`
        : "";

    lines.push(`${mrrStr} MRR${growth}`);
  }

  if (metrics.monthlyRevenue !== null && metrics.monthlyRevenue !== undefined) {
    const revStr =
      typeof metrics.monthlyRevenue.value === "number"
        ? fmtCurrency(metrics.monthlyRevenue.value, org.locale, org.currency)
        : String(metrics.monthlyRevenue.value);

    const growth =
      metrics.revenueGrowthRate !== null && metrics.revenueGrowthRate !== undefined
        ? ` (${metrics.revenueGrowthRate > 0 ? "+" : ""}${metrics.revenueGrowthRate.toFixed(1)}%)`
        : "";

    lines.push(`${revStr} receita${growth}`);
  }

  if (metrics.activeSubscriptions !== null && metrics.activeSubscriptions !== undefined) {
    lines.push(`${metrics.activeSubscriptions.value} assinantes`);
  }

  if (metrics.uniqueCustomers !== null && metrics.uniqueCustomers !== undefined) {
    lines.push(`${metrics.uniqueCustomers.value} clientes`);
  }

  lines.push("");
  lines.push("Building in public");

  return lines.join("\n");
}

export function PublicShareBar({ org, metrics, month }: PublicShareBarProps) {
  const [copied, setCopied] = useState(false);

  const pageUrl = `/p/${org.slug}`;

  const handleShare = useCallback(() => {
    const fullUrl = `${window.location.origin}${pageUrl}`;
    const tweetText = buildTweetText(org, metrics, month);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(fullUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [org, metrics, month, pageUrl]);

  const handleCopy = useCallback(async () => {
    const fullUrl = `${window.location.origin}${pageUrl}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pageUrl]);

  return (
    <div className="relative rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/10 via-transparent to-violet-950/10 pointer-events-none" />

      <div className="relative flex items-center justify-between gap-4 flex-wrap p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10 border border-indigo-500/20">
            <IconShare2 size={14} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-300">Compartilhar</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              Mostre seu progresso publicamente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-[11px] font-semibold text-zinc-300 transition-all hover:border-zinc-600"
          >
            <IconBrandX size={13} />
            Twitter
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-[11px] font-semibold text-zinc-300 transition-all hover:border-zinc-600"
          >
            {copied ? (
              <>
                <IconCheck size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <IconLink size={13} />
                Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
