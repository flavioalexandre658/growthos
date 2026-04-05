"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSyncProgress } from "@/hooks/queries/use-sync-progress";

interface SyncProgressProps {
  jobId: string;
  onCompleted: () => void;
  onFailed: () => void;
  titleKey?: string;
  subtitleKey?: string;
}

export function SyncProgress({
  jobId,
  onCompleted,
  onFailed,
  titleKey = "syncingTitle",
  subtitleKey = "syncingSubtitle",
}: SyncProgressProps) {
  const t = useTranslations("onboarding.stepGateway");
  const { data } = useSyncProgress(jobId);

  useEffect(() => {
    if (data?.state === "completed" || data?.state === "not_found") onCompleted();
    if (data?.state === "failed") onFailed();
  }, [data?.state, onCompleted, onFailed]);

  const isWaiting = !data || data.state === "waiting" || data.state === "delayed";
  const progress = data?.progress;
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : undefined;
  const isIndeterminate =
    isWaiting ||
    progress?.phase === "fetching" ||
    progress?.phase === "deleting";

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200">{t(titleKey)}</p>
          <p className="text-[11px] text-zinc-500">{t(subtitleKey)}</p>
        </div>
        {pct !== undefined && (
          <span className="text-xs tabular-nums text-zinc-400 shrink-0">
            {pct}%
          </span>
        )}
      </div>

      <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-zinc-700/60">
        {isIndeterminate ? (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-zinc-400/60 to-transparent animate-shimmer bg-[length:200%_100%]" />
        ) : (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out"
            style={{ width: `${pct ?? 0}%` }}
          />
        )}
      </div>

      {!isWaiting && progress?.message && (
        <p className="text-[11px] text-zinc-500 truncate leading-none">
          {progress.message}
        </p>
      )}
    </div>
  );
}
