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
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import Link from "next/link";
import { useParams } from "next/navigation";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

export function EventHealthStatus() {
  const { organization } = useOrganization();
  const { data, isLoading } = useEventHealth(organization?.id);
  const params = useParams<{ slug?: string }>();
  const slug = params?.slug ?? "";

  if (isLoading) {
    return <Skeleton className="h-12 w-full rounded-xl bg-zinc-800" />;
  }

  if (!data) return null;

  const { status, lastEventAt, todayCount } = data;

  if (status === "receiving") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20 border border-emerald-600/30 shrink-0">
            <IconCircleCheck size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-300">Recebendo eventos</p>
            <p className="text-xs text-emerald-700">
              Último {lastEventAt ? dayjs(lastEventAt).fromNow() : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-800/40 bg-emerald-900/30 px-3 py-1">
            <IconActivity size={12} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300 tabular-nums">{todayCount}</span>
            <span className="text-[10px] text-emerald-700">hoje</span>
          </div>
          <div className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-amber-800/40 bg-amber-950/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600/20 border border-amber-600/30 shrink-0">
            <IconAlertTriangle size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-300">Sem eventos hoje</p>
            <p className="text-xs text-amber-700">
              Último {lastEventAt ? dayjs(lastEventAt).fromNow() : "—"}
            </p>
          </div>
        </div>
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
          <p className="text-sm font-semibold text-red-300">Nunca recebeu eventos</p>
          <p className="text-xs text-red-700">Instale o tracker.js no seu site para começar</p>
        </div>
      </div>
      <Link
        href={`/${slug}/settings`}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-red-800/40 bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/50 transition-colors"
        )}
      >
        <IconSettings size={12} />
        Instalar
      </Link>
    </div>
  );
}
