"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { fmtInt } from "@/utils/format";
import type { IGenericFunnelData } from "@/interfaces/dashboard.interface";

const STEP_COLORS = [
  { color: "#6366f1", text: "text-indigo-400" },
  { color: "#8b5cf6", text: "text-violet-400" },
  { color: "#22c55e", text: "text-emerald-400" },
  { color: "#f59e0b", text: "text-amber-400" },
];

const RATE_STYLES = [
  { color: "text-violet-400", border: "border-violet-600/30", bg: "bg-violet-600/10" },
  { color: "text-emerald-400", border: "border-emerald-600/30", bg: "bg-emerald-600/10" },
  { color: "text-amber-400", border: "border-amber-600/30", bg: "bg-amber-600/10" },
  { color: "text-cyan-400", border: "border-cyan-600/30", bg: "bg-cyan-600/10" },
];

interface FunnelSectionProps {
  data: IGenericFunnelData | null | undefined;
  isLoading: boolean;
}

export function FunnelSection({ data, isLoading }: FunnelSectionProps) {
  const firstStepValue = data?.steps[0]?.value ?? 1;
  const stepCount = data?.steps.length ?? 3;

  const funnelLabel = data?.steps.map((s) => s.label).join(" → ") ?? "Funil de Conversão";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">Funil de Conversão</h3>
      <p className="mt-0.5 text-xs text-zinc-500">{funnelLabel}</p>

      {isLoading ? (
        <div className="mt-5 space-y-4">
          <div className="flex gap-3">
            {Array.from({ length: stepCount }).map((_, i) => (
              <div key={i} className="flex-1 text-center">
                <Skeleton className="h-10 rounded-lg bg-zinc-800" />
                <Skeleton className="mx-auto mt-2 h-3 w-16 bg-zinc-800" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            {Array.from({ length: stepCount }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-36 rounded-lg bg-zinc-800" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 flex gap-3">
            {data?.steps.map((step, idx) => {
              const style = STEP_COLORS[idx % STEP_COLORS.length];
              const pct = Math.max((step.value / firstStepValue) * 100, 4);
              return (
                <div key={step.key} className="flex-1 text-center">
                  <div
                    className="relative flex h-10 items-center justify-center overflow-hidden rounded-lg"
                    style={{ background: `${style.color}18` }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 rounded-lg transition-all duration-500"
                      style={{ width: `${pct}%`, background: `${style.color}35` }}
                    />
                    <span className={`relative text-base font-bold font-mono ${style.text}`}>
                      {fmtInt(step.value)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-500">{step.label}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {data?.rates.map((rate, idx) => {
              const style = RATE_STYLES[idx % RATE_STYLES.length];
              return (
                <div
                  key={rate.key}
                  className={`rounded-lg border ${style.border} ${style.bg} px-4 py-2.5 text-center`}
                >
                  <p className={`text-lg font-bold font-mono ${style.color}`}>
                    {rate.value}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-500">{rate.label}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
