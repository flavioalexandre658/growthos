"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import {
  IconCheck,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useTourProgress } from "@/hooks/queries/use-tour-progress";
import { useUpdateTourState } from "@/hooks/mutations/use-update-tour-state";
import type { ITourProgress } from "@/interfaces/tour.interface";

interface SetupChecklistProps {
  slug: string;
  organizationId: string | undefined;
  collapsed?: boolean;
}

interface ChecklistItem {
  id: keyof Pick<
    ITourProgress,
    "gatewayConnected" | "trackerInstalled" | "funnelEventReceived" | "costsConfigured" | "aiExplored"
  >;
  labelKey: string;
  ctaKey?: string;
  href?: string;
  auto?: boolean;
}

const ITEMS: ChecklistItem[] = [
  {
    id: "gatewayConnected",
    labelKey: "items.gateway.label",
    ctaKey: "items.gateway.cta",
    href: "settings/integrations",
  },
  {
    id: "trackerInstalled",
    labelKey: "items.tracker.label",
    ctaKey: "items.tracker.cta",
    href: "settings/installation",
  },
  {
    id: "funnelEventReceived",
    labelKey: "items.funnelEvent.label",
    auto: true,
  },
  {
    id: "costsConfigured",
    labelKey: "items.costs.label",
    ctaKey: "items.costs.cta",
    href: "costs",
  },
  {
    id: "aiExplored",
    labelKey: "items.ai.label",
    ctaKey: "items.ai.cta",
    href: "ai",
  },
];

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
  const [celebrating, setCelebrating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem("groware_checklist_collapsed") !== "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (progress?.allComplete && !progress.checklistDismissed && !celebrating && !dismissed) {
      setCelebrating(true);
      const timer = setTimeout(() => {
        updateTourState({ checklistDismissedAt: new Date().toISOString() });
        setDismissed(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [progress?.allComplete, progress?.checklistDismissed, celebrating, dismissed, updateTourState]);

  if (isLoading || !progress || progress.checklistDismissed || dismissed) return null;

  if (collapsed) {
    const pending = progress.totalCount - progress.completedCount;
    if (pending === 0) return null;
    return (
      <div className="flex justify-center py-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600/30 ring-1 ring-indigo-500/50 text-[9px] font-bold text-indigo-300">
          {pending}
        </div>
      </div>
    );
  }

  if (celebrating) {
    return (
      <div className="mx-3 mb-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2">
        <CelebrationBurst />
        <p className="text-center text-xs font-semibold text-emerald-400 mt-1">
          {t("celebration")}
        </p>
      </div>
    );
  }

  const nextItemIndex = ITEMS.findIndex((item) => !progress[item.id]);

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
                · {progress.completedCount}/{progress.totalCount}
              </span>
            )}
          </p>
          {expanded && (
            <p className="text-[10px] text-zinc-600 mt-0.5 leading-none">
              {t("progress", { completed: progress.completedCount, total: progress.totalCount })}
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
              style={{ width: `${(progress.completedCount / progress.totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {expanded && (
        <div className="px-2 py-1.5 space-y-px">
          {ITEMS.map((item, index) => {
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
                    onClick={() => router.push(`/${slug}/${item.href}` as never)}
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
