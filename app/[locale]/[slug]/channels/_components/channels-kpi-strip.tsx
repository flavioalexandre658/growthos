"use client";

import { useTranslations } from "next-intl";
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
  rightBorder?: boolean;
  bottomBorder?: boolean;
}

function KpiItem({ label, value, sub, rightBorder, bottomBorder }: KpiItemProps) {
  return (
    <div
      className={[
        "flex flex-col gap-0.5 px-4 py-3 min-w-0",
        rightBorder ? "border-r border-zinc-800" : "",
        bottomBorder ? "border-b border-zinc-800" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider truncate">
        {label}
      </span>
      <div className="text-sm font-bold font-mono text-zinc-100 truncate">{value}</div>
      {sub && <div className="text-[10px] text-zinc-600 truncate">{sub}</div>}
    </div>
  );
}

export function ChannelsKpiStrip({ data, isLoading }: ChannelsKpiStripProps) {
  const t = useTranslations("channels.kpiStrip");

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 grid grid-cols-2 sm:flex overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 px-4 py-3 border-r border-zinc-800 last:border-r-0 border-b sm:border-b-0 [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r [&:nth-child(n+3)]:border-b-0"
          >
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
    <>
      <div className="sm:hidden rounded-xl border border-zinc-800 bg-zinc-900/50 grid grid-cols-2 overflow-hidden">
        <KpiItem
          label={t("totalChannels")}
          value={totalChannels}
          sub={t("withRevenue", { count: channelsWithRevenue })}
          rightBorder
          bottomBorder
        />
        <KpiItem
          label={t("totalRevenue")}
          value={<span className="text-emerald-400">{fmtBRLDecimal(totalRevenue / 100)}</span>}
          sub={t("inPeriod")}
          bottomBorder
        />
        <KpiItem
          label={t("leadChannel")}
          value={
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full shrink-0"
                style={{ background: topChannelColor }}
              />
              <span className="truncate">{topChannelName || "—"}</span>
            </span>
          }
          sub={topChannel ? t("highestRevenue") : undefined}
          rightBorder
        />
        <KpiItem
          label={t("concentration")}
          value={
            concentrationTop2 > 0 ? (
              <span className={concentrationTop2 >= 80 ? "text-amber-400" : "text-zinc-100"}>
                {concentrationTop2}%
              </span>
            ) : "—"
          }
          sub={concentrationTop2 > 0 ? t("top2Channels") : undefined}
        />
      </div>

      <div className="hidden sm:flex rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <KpiItem
          label={t("totalChannels")}
          value={totalChannels}
          sub={t("withRevenue", { count: channelsWithRevenue })}
          rightBorder
        />
        <KpiItem
          label={t("totalRevenue")}
          value={<span className="text-emerald-400">{fmtBRLDecimal(totalRevenue / 100)}</span>}
          sub={t("inPeriod")}
          rightBorder
        />
        <KpiItem
          label={t("leadChannel")}
          value={
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full shrink-0"
                style={{ background: topChannelColor }}
              />
              {topChannelName || "—"}
            </span>
          }
          sub={topChannel ? t("highestRevenue") : undefined}
          rightBorder
        />
        <KpiItem
          label={t("concentration")}
          value={
            concentrationTop2 > 0 ? (
              <span className={concentrationTop2 >= 80 ? "text-amber-400" : "text-zinc-100"}>
                {concentrationTop2}%
              </span>
            ) : "—"
          }
          sub={concentrationTop2 > 0 ? t("top2Channels") : undefined}
        />
      </div>
    </>
  );
}
