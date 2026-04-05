"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { IconCheck, IconChevronRight, IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { getChecklistItems } from "@/lib/checklist-items";
import { useTourProgress } from "@/hooks/queries/use-tour-progress";
import { useUpdateTourState } from "@/hooks/mutations/use-update-tour-state";
import { useBilling } from "@/hooks/queries/use-billing";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useOrganization } from "@/components/providers/organization-provider";

interface MobileChecklistBannerProps {
  slug: string;
}

export function MobileChecklistBanner({ slug }: MobileChecklistBannerProps) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  const t = useTranslations("tour.checklist");
  const router = useRouter();
  const { data: progress, isLoading } = useTourProgress(organizationId);
  const { mutate: updateTourState } = useUpdateTourState(organizationId);
  const { data: billing } = useBilling();
  const hasAi = billing?.plan.hasAiAnalysis ?? false;

  const visibleItems = getChecklistItems().filter((item) => {
    if (item.id === "aiExplored" && !hasAi) return false;
    return true;
  });

  const [open, setOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("groware_checklist_dismissed") === "1";
    } catch {
      return false;
    }
  });

  const visibleCompletedCount = progress
    ? visibleItems.filter((item) => progress[item.id]).length
    : 0;
  const visibleTotalCount = visibleItems.length;

  useEffect(() => {
    if (!progress || progress.checklistDismissed || celebrating || dismissed) return;
    if (visibleCompletedCount === visibleTotalCount && visibleTotalCount > 0) {
      setCelebrating(true);
      const timer = setTimeout(() => {
        updateTourState({ checklistDismissedAt: new Date().toISOString() });
        setDismissed(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [progress, celebrating, dismissed, visibleCompletedCount, visibleTotalCount, updateTourState]);

  if (isLoading || !progress || progress.checklistDismissed || dismissed) return null;

  const nextItemIndex = visibleItems.findIndex((item) => !progress[item.id]);
  const nextItem = nextItemIndex >= 0 ? visibleItems[nextItemIndex] : null;

  const handleCta = (href: string) => {
    setOpen(false);
    router.push((href.startsWith("/") ? href : `/${slug}/${href}`) as never);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex w-full items-center gap-3 border-b border-zinc-800/60 bg-zinc-900/80 px-4 py-2.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-zinc-400">
              {t("title")}
            </span>
            <span className="text-[11px] text-zinc-600">
              · {visibleCompletedCount}/{visibleTotalCount}
            </span>
          </div>
          {nextItem && (
            <p className="text-[11px] text-indigo-400 leading-none mt-0.5 truncate">
              {t("mobileBanner.next", { step: t(nextItem.labelKey) })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {celebrating ? (
            <span className="text-[11px] font-semibold text-emerald-400">
              {t("celebration")}
            </span>
          ) : nextItem?.ctaKey ? (
            <span className="flex items-center gap-0.5 rounded bg-indigo-600/20 px-2 py-1 text-[10px] font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-600/30">
              {t(nextItem.ctaKey)}
              <IconChevronRight size={9} />
            </span>
          ) : (
            <IconChevronDown size={14} className="text-zinc-600" />
          )}
        </div>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="border-zinc-800 bg-zinc-950 max-h-[85vh]">
          <DrawerTitle className="sr-only">{t("title")}</DrawerTitle>

          <div className="flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-zinc-800/60">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-zinc-200">{t("title")}</p>
                <p className="text-xs text-zinc-500">
                  {t("progress", { completed: visibleCompletedCount, total: visibleTotalCount })}
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
                  style={{ width: `${(visibleCompletedCount / visibleTotalCount) * 100}%` }}
                />
              </div>
            </div>

            <div className="overflow-y-auto px-3 py-3 space-y-1 pb-8">
              {visibleItems.map((item, index) => {
                const isDone = progress[item.id];
                const isNext = index === nextItemIndex;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                      isDone && "opacity-45",
                      isNext && !isDone && "bg-indigo-950/40 ring-1 ring-inset ring-indigo-900/60",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors",
                        isDone
                          ? "bg-emerald-500/20 ring-emerald-500/40"
                          : isNext
                            ? "bg-indigo-600/20 ring-indigo-500/40"
                            : "bg-zinc-800/60 ring-zinc-700/40",
                      )}
                    >
                      {isDone && (
                        <IconCheck size={11} className="text-emerald-400" strokeWidth={3} />
                      )}
                    </div>

                    <p
                      className={cn(
                        "flex-1 text-sm font-medium leading-none",
                        isDone
                          ? "text-zinc-600 line-through"
                          : isNext
                            ? "text-zinc-100"
                            : "text-zinc-500",
                      )}
                    >
                      {t(item.labelKey)}
                    </p>

                    {isNext && !isDone && item.href && item.ctaKey && (
                      <button
                        onClick={() => handleCta(item.href!)}
                        className="shrink-0 flex items-center gap-1 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-600/30 hover:bg-indigo-600/30 transition-colors active:scale-95"
                      >
                        {t(item.ctaKey)}
                        <IconChevronRight size={11} />
                      </button>
                    )}

                    {isNext && !isDone && item.auto && (
                      <span className="shrink-0 rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-medium text-zinc-500">
                        Auto
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
