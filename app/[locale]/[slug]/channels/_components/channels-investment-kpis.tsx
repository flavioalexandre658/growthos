"use client";

import { useTranslations } from "next-intl";
import { fmtBRLDecimal } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { IChannelInvestmentGroup } from "@/interfaces/dashboard.interface";

interface ChannelsInvestmentKpisProps {
  groups: IChannelInvestmentGroup[];
}

function roiColor(roi: number | null) {
  if (roi === null) return "text-zinc-500";
  if (roi >= 500) return "text-emerald-400";
  if (roi >= 100) return "text-zinc-300";
  if (roi >= 0) return "text-amber-400";
  return "text-red-400";
}

export function ChannelsInvestmentKpis({ groups }: ChannelsInvestmentKpisProps) {
  const t = useTranslations("channels.investmentKpis");

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {groups.map((group) => (
        <div
          key={group.source}
          className="rounded-xl border border-violet-800/40 bg-violet-900/10 px-4 py-3 flex items-center gap-4"
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400 mb-1">
              {group.label}
            </span>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500">{t("invest")}</span>
                <span className="font-mono text-sm font-bold text-violet-400">
                  {fmtBRLDecimal(group.investmentInCents / 100)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500">{t("revenue")}</span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {fmtBRLDecimal(group.revenueInCents / 100)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500">{t("roi")}</span>
                <span className={cn("font-mono text-sm font-bold", roiColor(group.roi))}>
                  {group.roi !== null ? `${group.roi >= 0 ? "+" : ""}${group.roi}%` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
