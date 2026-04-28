"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { useChannelBreakdown } from "@/hooks/queries/use-channel-breakdown";
import { fmtCurrencyDecimal, fmtInt } from "@/utils/format";
import type { IDateFilter, IChannelBreakdownItem } from "@/interfaces/dashboard.interface";

interface ChannelsBreakdownPanelProps {
  organizationId: string | undefined;
  channelKey: string;
  filter: IDateFilter;
  locale: string;
  currency: string;
}

function BreakdownList({
  title,
  items,
  emptyLabel,
  locale,
  currency,
}: {
  title: string;
  items: IChannelBreakdownItem[];
  emptyLabel: string;
  locale: string;
  currency: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{title}</span>
      {items.length === 0 ? (
        <span className="text-[11px] text-zinc-600 italic">{emptyLabel}</span>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate text-zinc-300">{item.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-zinc-500">{fmtInt(item.count)}</span>
                {item.revenue > 0 && (
                  <span className="font-mono text-emerald-400">
                    {fmtCurrencyDecimal(item.revenue / 100, locale, currency)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChannelsBreakdownPanel({
  organizationId,
  channelKey,
  filter,
  locale,
  currency,
}: ChannelsBreakdownPanelProps) {
  const t = useTranslations("channels.breakdown");
  const { data, isLoading } = useChannelBreakdown(organizationId, channelKey, filter);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mt-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-20 bg-zinc-800 rounded" />
            <Skeleton className="h-3 w-full bg-zinc-800 rounded" />
            <Skeleton className="h-3 w-3/4 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mt-3 border-t border-zinc-800 pt-3">
      <BreakdownList
        title={t("campaigns")}
        items={data?.campaigns ?? []}
        emptyLabel={t("empty")}
        locale={locale}
        currency={currency}
      />
      <BreakdownList
        title={t("contents")}
        items={data?.contents ?? []}
        emptyLabel={t("empty")}
        locale={locale}
        currency={currency}
      />
      <BreakdownList
        title={t("terms")}
        items={data?.terms ?? []}
        emptyLabel={t("empty")}
        locale={locale}
        currency={currency}
      />
    </div>
  );
}
