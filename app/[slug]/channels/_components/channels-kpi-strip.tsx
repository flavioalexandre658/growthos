"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { getChannelName, getChannelColor } from "@/utils/channel-colors";
import { fmtBRLDecimal } from "@/utils/format";
import type { IChannelsResult } from "@/interfaces/dashboard.interface";

interface ChannelsKpiStripProps {
  data: IChannelsResult | undefined;
  isLoading: boolean;
}

interface KpiItemProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  divider?: boolean;
}

function KpiItem({ label, value, sub, divider = true }: KpiItemProps) {
  return (
    <div className={`flex-1 px-5 py-3 flex flex-col gap-0.5 ${divider ? "border-r border-zinc-800" : ""}`}>
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
      <div className="text-sm font-bold font-mono text-zinc-100">{value}</div>
      {sub && <div className="text-[10px] text-zinc-600">{sub}</div>}
    </div>
  );
}

export function ChannelsKpiStrip({ data, isLoading }: ChannelsKpiStripProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 flex overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 px-5 py-3 border-r border-zinc-800 last:border-r-0">
            <Skeleton className="h-3 w-16 bg-zinc-800 mb-2 rounded" />
            <Skeleton className="h-5 w-24 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const totalChannels = data ? (data.pagination?.total ?? data.data.length) : 0;
  const channelsWithRevenue = data?.channelsWithRevenue ?? 0;
  const topChannel = data?.topChannel ?? "";
  const concentrationTop2 = data?.concentrationTop2 ?? 0;
  const totalRevenue = data?.totalRevenue ?? 0;

  const topChannelColor = topChannel ? getChannelColor(topChannel, 0) : "#6366f1";
  const topChannelName = topChannel ? getChannelName(topChannel) : "—";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 flex overflow-hidden">
      <KpiItem
        label="Total de Canais"
        value={totalChannels}
        sub={`${channelsWithRevenue} com receita`}
      />
      <KpiItem
        label="Receita Total"
        value={
          <span className="text-emerald-400">{fmtBRLDecimal(totalRevenue / 100)}</span>
        }
        sub="no período"
      />
      <KpiItem
        label="Canal Líder"
        value={
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ background: topChannelColor }}
            />
            {topChannelName || "—"}
          </span>
        }
        sub={topChannel ? "maior receita" : undefined}
      />
      <KpiItem
        label="Concentração"
        value={
          concentrationTop2 > 0 ? (
            <span className={concentrationTop2 >= 80 ? "text-amber-400" : "text-zinc-100"}>
              {concentrationTop2}%
            </span>
          ) : "—"
        }
        sub={concentrationTop2 > 0 ? "top 2 canais" : undefined}
        divider={false}
      />
    </div>
  );
}
