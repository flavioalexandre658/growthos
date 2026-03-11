"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
  IconCheck,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { getChecklistItems } from "@/lib/checklist-items";
import { useTourProgress } from "@/hooks/queries/use-tour-progress";
import { useUpdateTourState } from "@/hooks/mutations/use-update-tour-state";
import { useBilling } from "@/hooks/queries/use-billing";

interface SetupChecklistProps {
  slug: string;
  organizationId: string | undefined;
  collapsed?: boolean;
}

function CelebrationBurst() {
  return (
    <div className="relative flex items-center justify-center py-3">
      <div className="absolute inset-0 flex items-center justify-center">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"
            style={{
              transform: `rotate(${i * 45}deg) translateX(14px)`,
              animationDelay: `${i * 60}ms`,
              animationDuration: "800ms",
            }}
          />
        ))}
      </div>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/40">
        <IconCheck size={16} className="text-emerald-400" strokeWidth={2.5} />
      </div>
    </div>
  );
}

export function SetupChecklist({ slug, organizationId, collapsed }: SetupChecklistProps) {
  const t = useTranslations("tour.checklist");
  const router = useRouter();
  const { data: progress, isLoading } = useTourProgress(organizationId);
  const { mutate: updateTourState } = useUpdateTourState(organizationId);
  const { data: billing } = useBilling();
  const hasAi = billing?.plan.hasAiAnalysis ?? false;

  const visibleItems = getChecklistItems(slug).filter((item) => {
    if (item.id === "aiExplored" && !hasAi) return false;
    return true;
  });
  const [celebrating, setCelebrating] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("groware_checklist_dismissed") === "1";
    } catch {
      return false;
    }
  });
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem("groware_checklist_collapsed") !== "1";
    } catch {
      return true;
    }
  });

  const handleDismiss = useCallback(() => {
    try { localStorage.setItem("groware_checklist_dismissed", "1"); } catch {}
    updateTourState({ checklistDismissedAt: new Date().toISOString() });
    setDismissed(true);
  }, [updateTourState]);

  useEffect(() => {
    if (!progress || progress.checklistDismissed || celebrating || dismissed) return;
    const visibleDone = visibleItems.filter((item) => progress[item.id]).length;
    if (visibleDone === visibleItems.length && visibleItems.length > 0) {
      setCelebrating(true);
      const timer = setTimeout(() => {
        handleDismiss();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [progress, celebrating, dismissed, visibleItems, handleDismiss]);

  if (isLoading || !progress || progress.checklistDismissed || dismissed) return null;

  const visibleCompletedCount = visibleItems.filter((item) => progress[item.id]).length;
  const visibleTotalCount = visibleItems.length;
  const visibleAllComplete = visibleCompletedCount === visibleTotalCount;

  if (collapsed) {
    const pending = visibleTotalCount - visibleCompletedCount;
    if (pending === 0) return null;
    return (
      <div className="flex justify-center py-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600/30 ring-1 ring-indigo-500/50 text-[9px] font-bold text-indigo-300">
          {pending}
        </div>
      </div>
    );
  }

  if (celebrating || visibleAllComplete) {
    return (
      <div className="mx-3 mb-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 relative">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-0.5 text-emerald-700 hover:text-emerald-400 transition-colors"
        >
          <IconX size={11} />
        </button>
        <CelebrationBurst />
        <p className="text-center text-xs font-semibold text-emerald-400 mt-1">
          {t("celebration")}
        </p>
      </div>
    );
  }

  const nextItemIndex = visibleItems.findIndex((item) => !progress[item.id]);

  return (
    <div className="mx-3 mb-2 rounded-xl border border-zinc-800 bg-zinc-900/60">
      <button
        onClick={() => {
          setExpanded((v) => {
            const next = !v;
            try { localStorage.setItem("groware_checklist_collapsed", next ? "0" : "1"); } catch {}
            return next;
          });
        }}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-zinc-300 leading-none">
            {t("title")}
            {!expanded && (
              <span className="ml-1 text-[10px] font-normal text-zinc-600">
                · {visibleCompletedCount}/{visibleTotalCount}
              </span>
            )}
          </p>
          {expanded && (
            <p className="text-[10px] text-zinc-600 mt-0.5 leading-none">
              {t("progress", { completed: visibleCompletedCount, total: visibleTotalCount })}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {expanded ? (
            <IconChevronUp size={13} className="text-zinc-600" />
          ) : (
            <IconChevronDown size={13} className="text-zinc-600" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-1">
          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
              style={{ width: `${(visibleCompletedCount / visibleTotalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {expanded && (
        <div className="px-2 py-1.5 space-y-px">
          {visibleItems.map((item, index) => {
            const isDone = progress[item.id];
            const isNext = index === nextItemIndex;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                  isDone && "opacity-45",
                )}
              >
                <div
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors",
                    isDone
                      ? "bg-emerald-500/20 ring-emerald-500/40"
                      : isNext
                        ? "bg-indigo-600/20 ring-indigo-500/40"
                        : "bg-zinc-800/60 ring-zinc-700/40",
                  )}
                >
                  {isDone && (
                    <IconCheck size={8} className="text-emerald-400" strokeWidth={3} />
                  )}
                </div>
                <p
                  className={cn(
                    "flex-1 min-w-0 text-[11px] font-medium leading-none truncate",
                    isDone
                      ? "text-zinc-600 line-through"
                      : isNext
                        ? "text-zinc-200"
                        : "text-zinc-500",
                  )}
                >
                  {t(item.labelKey)}
                </p>
                {isNext && !isDone && item.href && item.ctaKey && (
                  <button
                    onClick={() => router.push((item.href!.startsWith("/") ? item.href! : `/${slug}/${item.href}`) as never)}
                    className="shrink-0 flex items-center gap-0.5 rounded bg-indigo-600/20 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-300 hover:bg-indigo-600/30 transition-colors"
                  >
                    {t(item.ctaKey)}
                    <IconChevronRight size={8} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
