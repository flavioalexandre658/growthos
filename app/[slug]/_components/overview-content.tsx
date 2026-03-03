"use client";

import { Suspense, useState, useCallback } from "react";
import { useFunnel } from "@/hooks/queries/use-funnel";
import { useDaily } from "@/hooks/queries/use-daily";
import { useSourceDistribution } from "@/hooks/queries/use-source-distribution";
import { useRevenueComparison } from "@/hooks/queries/use-revenue-comparison";
import { useOrganization } from "@/components/providers/organization-provider";
import { IDateFilter } from "@/interfaces/dashboard.interface";
import { KpiCards } from "./kpi-cards";
import { FunnelSection } from "./funnel-section";
import { DailyChart } from "./daily-chart";
import { PeriodFilter } from "./period-filter";
import { SourceChart } from "./source-chart";
import { RecentPayments } from "./recent-payments";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface StepOption {
  eventType: string;
  label: string;
}

interface StepVisibilityToggleProps {
  steps: StepOption[];
  hiddenKeys: Set<string>;
  onToggle: (eventType: string) => void;
}

function StepVisibilityToggle({ steps, hiddenKeys, onToggle }: StepVisibilityToggleProps) {
  const hiddenCount = steps.filter((s) => hiddenKeys.has(s.eventType)).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
            hiddenCount > 0
              ? "border-amber-800/40 bg-amber-950/20 text-amber-400 hover:bg-amber-950/30"
              : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600"
          )}
          title="Etapas visíveis"
        >
          <IconEye size={13} />
          <span className="hidden sm:inline">Etapas</span>
          {hiddenCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-600/30 text-[9px] font-bold text-amber-300">
              {hiddenCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 border-zinc-800 bg-zinc-900 p-0 shadow-xl"
        align="end"
        sideOffset={6}
      >
        <div className="px-3 py-2.5 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-300">Etapas visíveis</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Alternância temporária — não persiste</p>
        </div>
        <div className="p-1.5 space-y-0.5">
          {steps.map((step) => {
            const isHidden = hiddenKeys.has(step.eventType);
            return (
              <button
                key={step.eventType}
                type="button"
                onClick={() => onToggle(step.eventType)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                  isHidden
                    ? "text-zinc-600 hover:bg-zinc-800/60 hover:text-zinc-400"
                    : "text-zinc-200 hover:bg-zinc-800/60"
                )}
              >
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded shrink-0 transition-colors",
                    isHidden ? "bg-zinc-800" : "bg-indigo-600/20"
                  )}
                >
                  {isHidden ? (
                    <IconEyeOff size={11} className="text-zinc-600" />
                  ) : (
                    <IconEye size={11} className="text-indigo-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-medium truncate", isHidden && "line-through")}>
                    {step.label}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-700 truncate">{step.eventType}</p>
                </div>
              </button>
            );
          })}
        </div>
        {hiddenCount > 0 && (
          <div className="px-2.5 pb-2.5">
            <button
              type="button"
              onClick={() => steps.forEach((s) => { if (hiddenKeys.has(s.eventType)) onToggle(s.eventType); })}
              className="w-full rounded-md border border-zinc-700/50 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
            >
              Mostrar todas
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface OverviewContentProps {
  filter: IDateFilter;
}

export function OverviewContent({ filter }: OverviewContentProps) {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const initialHiddenKeys = new Set(
    (organization?.funnelSteps ?? [])
      .filter((s) => s.hidden)
      .map((s) => s.eventType)
  );

  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(initialHiddenKeys);

  const toggleHidden = useCallback((eventType: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) next.delete(eventType);
      else next.add(eventType);
      return next;
    });
  }, []);

  const { data: funnel, isPending: funnelLoading } = useFunnel(orgId, filter);
  const { data: dailyResult, isPending: dailyLoading } = useDaily(orgId, filter);
  const { data: sourceData, isPending: sourceLoading } = useSourceDistribution(orgId, filter);
  const { data: revenueComparison, isPending: comparisonLoading } = useRevenueComparison(orgId);

  const allSteps: StepOption[] = (funnel?.steps ?? [])
    .filter((s) => s.key !== "pageview")
    .map((s) => ({ eventType: s.key, label: s.label }));

  const stepMeta = funnel?.steps.map((s) => ({ key: s.key, label: s.label })) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Visão Geral</h1>
          <p className="text-xs text-zinc-500">Performance consolidada do período</p>
        </div>
        <div className="flex items-center gap-2">
          {allSteps.length > 0 && (
            <StepVisibilityToggle
              steps={allSteps}
              hiddenKeys={hiddenKeys}
              onToggle={toggleHidden}
            />
          )}
          <Suspense>
            <PeriodFilter filter={filter} />
          </Suspense>
        </div>
      </div>

      <KpiCards data={funnel} isLoading={funnelLoading} hiddenKeys={hiddenKeys} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <FunnelSection
          data={funnel}
          isLoading={funnelLoading}
          hiddenKeys={hiddenKeys}
        />
        <SourceChart data={sourceData} isLoading={sourceLoading} />
      </div>

      <RecentPayments
        payments={revenueComparison?.recentPayments ?? []}
        isLoading={comparisonLoading}
      />

      <DailyChart
        data={dailyResult?.rows}
        stepMeta={stepMeta}
        isLoading={dailyLoading}
        hiddenKeys={hiddenKeys}
      />
    </div>
  );
}
