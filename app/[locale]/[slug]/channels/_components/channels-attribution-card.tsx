"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import type { IChannelAttributionRate } from "@/interfaces/dashboard.interface";

interface ChannelsAttributionCardProps {
  attributionRate?: IChannelAttributionRate;
  isLoading: boolean;
}

export function ChannelsAttributionCard({
  attributionRate,
  isLoading,
}: ChannelsAttributionCardProps) {
  const t = useTranslations("channels.attributionRate");

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 min-w-[180px]">
        <Skeleton className="h-3 w-24 bg-zinc-800 mb-2 rounded" />
        <Skeleton className="h-5 w-16 bg-zinc-800 rounded" />
        <Skeleton className="h-3 w-32 bg-zinc-800 mt-2 rounded" />
      </div>
    );
  }

  const total = attributionRate?.total ?? 0;
  const attributed = attributionRate?.attributed ?? 0;
  const percentage = attributionRate?.percentage ?? 0;

  const colorClass =
    percentage >= 70
      ? "text-emerald-400"
      : percentage >= 40
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 min-w-[180px]">
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider truncate block">
        {t("title")}
      </span>
      <div className={`text-sm font-bold font-mono truncate ${colorClass}`}>
        {percentage}%
      </div>
      <div className="text-[10px] text-zinc-600 truncate">
        {t("subtitle", { attributed, total })}
      </div>
    </div>
  );
}
