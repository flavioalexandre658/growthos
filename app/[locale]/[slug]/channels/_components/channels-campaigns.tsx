"use client";

import { useTranslations } from "next-intl";
import { useOrganization } from "@/components/providers/organization-provider";
import { useTopCampaigns } from "@/hooks/queries/use-top-campaigns";
import { fmtBRLDecimal, fmtInt } from "@/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import { IconSparkles } from "@tabler/icons-react";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

interface ChannelsCampaignsProps {
  filter: IDateFilter;
}

export function ChannelsCampaigns({ filter }: ChannelsCampaignsProps) {
  const t = useTranslations("channels.campaigns");
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: campaigns, isPending: isLoading } = useTopCampaigns(orgId, filter);

  const totalRevenue = (campaigns ?? []).reduce((s, c) => s + c.revenue, 0);

  if (!isLoading && (!campaigns || campaigns.length === 0)) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <IconSparkles size={14} className="text-amber-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
            <p className="text-[10px] text-zinc-500">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-40 bg-zinc-800" />
              <Skeleton className="h-3.5 w-24 bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="hidden sm:grid grid-cols-[1fr_130px_80px_80px] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 border-b border-zinc-800/40">
            <span>{t("colCampaign")}</span>
            <span className="text-right">{t("colRevenue")}</span>
            <span className="text-right">{t("colPurchases")}</span>
            <span className="text-right">%</span>
          </div>
          <div className="divide-y divide-zinc-800/40">
            {campaigns!.map((c, idx) => {
              const pct = totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0;
              return (
                <div
                  key={c.campaign}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_130px_80px_80px] items-center gap-2 px-4 py-2.5 hover:bg-zinc-800/20 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-zinc-600 shrink-0 w-4">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-zinc-300 truncate">
                      {c.campaign}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-400 text-right">
                    {fmtBRLDecimal(c.revenue / 100)}
                  </span>
                  <span className="hidden sm:block font-mono text-xs text-zinc-500 text-right">
                    {fmtInt(c.purchases)}
                  </span>
                  <div className="hidden sm:flex items-center justify-end gap-1.5">
                    <span className="font-mono text-[10px] text-zinc-500">{pct}%</span>
                    <div className="w-12 h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
