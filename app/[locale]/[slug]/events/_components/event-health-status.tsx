"use client";

import { useOrganization } from "@/components/providers/organization-provider";
import { useEventHealth } from "@/hooks/queries/use-event-health";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconCircleCheck,
  IconAlertTriangle,
  IconCircleX,
  IconSettings,
  IconActivity,
  IconClockExclamation,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import "dayjs/locale/en";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import type { IEventHealth } from "@/interfaces/event.interface";

dayjs.extend(relativeTime);

function HourlyTimeline({
  hourlyVolume,
  accentClass,
}: {
  hourlyVolume: IEventHealth["hourlyVolume"];
  accentClass: string;
}) {
  const t = useTranslations("events.healthStatus");

  if (!hourlyVolume || hourlyVolume.length === 0) return null;

  const max = Math.max(...hourlyVolume.map((h) => h.count), 1);
  const peakIdx = hourlyVolume.reduce(
    (best, h, i) => (h.count > hourlyVolume[best].count ? i : best),
    0
  );
  const peak = hourlyVolume[peakIdx];
  const peakHour = dayjs(peak.hour).format("HH[h]");

  return (
    <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-current/5">
      <span className="text-[9px] text-current opacity-40 shrink-0 font-medium">{t("last24h")}</span>
      <div className="flex items-end gap-px flex-1" style={{ height: 18 }}>
        {hourlyVolume.map((h, i) => {
          const heightPct = h.count === 0 ? 2 : Math.max((h.count / max) * 100, 6);
          const isPeak = i === peakIdx && h.count > 0;
          return (
            <div
              key={h.hour}
              title={t("peak", { hour: dayjs(h.hour).format("HH[h]"), count: h.count })}
              className={cn(
                "flex-1 rounded-sm transition-all",
                isPeak ? accentClass : "bg-current opacity-20"
              )}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>
      {peak.count > 0 && (
        <span className="text-[9px] text-current opacity-40 shrink-0 whitespace-nowrap">
          {t("peak", { hour: peakHour, count: peak.count })}
        </span>
      )}
    </div>
  );
}

export function EventHealthStatus() {
  const { organization } = useOrganization();
  const { data, isLoading } = useEventHealth(organization?.id);
  const params = useParams<{ slug?: string }>();
  const slug = params?.slug ?? "";
  const t = useTranslations("events.healthStatus");
  const locale = useLocale();
  const dayjsLocale = locale === "pt" ? "pt-br" : locale;

  if (isLoading) {
    return <Skeleton className="h-16 w-full rounded-xl bg-zinc-800" />;
  }

  if (!data) return null;

  const { status, lastEventAt, todayCount, minutesSinceLastEvent, hourlyVolume } = data;

  if (status === "receiving") {
    return (
      <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-3 text-emerald-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20 border border-emerald-600/30 shrink-0">
              <IconCircleCheck size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">{t("receiving")}</p>
              <p className="text-xs text-emerald-700">
                {t("lastEvent", { lastEventAt: lastEventAt ? dayjs(lastEventAt).locale(dayjsLocale).fromNow() : "—" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-800/40 bg-emerald-900/30 px-3 py-1">
              <IconActivity size={12} className="text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300 tabular-nums">{todayCount}</span>
              <span className="text-[10px] text-emerald-700">{t("today")}</span>
            </div>
            <div className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          </div>
        </div>
        <HourlyTimeline hourlyVolume={hourlyVolume} accentClass="bg-emerald-400 opacity-90" />
      </div>
    );
  }

  if (status === "stale") {
    const minutes = minutesSinceLastEvent ?? 0;
    const timeLabel = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes} min`;
    return (
      <div className="rounded-xl border border-orange-800/40 bg-orange-950/20 px-4 py-3 text-orange-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600/20 border border-orange-600/30 shrink-0">
              <IconClockExclamation size={16} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-orange-300">{t("noNewEvents", { timeLabel })}</p>
              <p className="text-xs text-orange-700">
                {t("lastEvent", { lastEventAt: lastEventAt ? dayjs(lastEventAt).locale(dayjsLocale).fromNow() : "—" })} · {t("todayCount", { count: todayCount })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-orange-800/40 bg-orange-900/30 px-3 py-1">
            <IconActivity size={12} className="text-orange-400" />
            <span className="text-xs font-bold text-orange-300 tabular-nums">{todayCount}</span>
            <span className="text-[10px] text-orange-700">{t("today")}</span>
          </div>
        </div>
        <HourlyTimeline hourlyVolume={hourlyVolume} accentClass="bg-orange-400 opacity-90" />
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 px-4 py-3 text-amber-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600/20 border border-amber-600/30 shrink-0">
              <IconAlertTriangle size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">{t("noEventsToday")}</p>
              <p className="text-xs text-amber-700">
                {t("lastEvent", { lastEventAt: lastEventAt ? dayjs(lastEventAt).locale(dayjsLocale).fromNow() : "—" })}
              </p>
            </div>
          </div>
        </div>
        <HourlyTimeline hourlyVolume={hourlyVolume} accentClass="bg-amber-400 opacity-90" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-red-800/40 bg-red-950/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/20 border border-red-600/30 shrink-0">
          <IconCircleX size={16} className="text-red-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-300">{t("neverReceived")}</p>
          <p className="text-xs text-red-700">{t("installTrackerHint")}</p>
        </div>
      </div>
      <Link
        href={`/${slug}/settings`}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-red-800/40 bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/50 transition-colors"
        )}
      >
        <IconSettings size={12} />
        {t("install")}
      </Link>
    </div>
  );
}
