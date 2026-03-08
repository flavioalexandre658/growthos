"use client";

import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtInt } from "@/utils/format";
import { getStepColor } from "@/utils/step-colors";
import type { IGenericFunnelData } from "@/interfaces/dashboard.interface";
import { useTranslations } from "next-intl";

interface FunnelSectionProps {
  data: IGenericFunnelData | null | undefined;
  isLoading: boolean;
  hiddenKeys?: Set<string>;
}

interface SankeyFunnelProps {
  steps: { key: string; label: string; value: number }[];
  allStepKeys: string[];
}

const W = 900;
const H = 360;
const FLOW_TOP = 36;
const FLOW_BOT = H - 36;
const FLOW_H = FLOW_BOT - FLOW_TOP;
const CY = FLOW_TOP + FLOW_H / 2;

// 5 bands: progressively narrower toward center, solid core in the middle
const BANDS = [
  { scale: 0.72, opacity: 0.08 },
  { scale: 0.6, opacity: 0.13 },
  { scale: 0.48, opacity: 0.22 },
  { scale: 0.36, opacity: 0.42 },
  { scale: 0.38, opacity: 0.72 },
];

function logH(value: number, maxLog: number): number {
  const MIN = FLOW_H * 0.08;
  if (value <= 0 || maxLog <= 0) return MIN;
  return MIN + (Math.log2(value + 1) / maxLog) * (FLOW_H - MIN);
}

function nX(i: number, n: number): number {
  if (n <= 1) return W / 2;
  const pad = 20;
  return pad + (i / (n - 1)) * (W - pad * 2);
}

function flowPath(x1: number, h1: number, x2: number, h2: number): string {
  const t1 = CY - h1 / 2;
  const b1 = CY + h1 / 2;
  const t2 = CY - h2 / 2;
  const b2 = CY + h2 / 2;
  const dx = (x2 - x1) * 0.42;
  return [
    `M ${x1} ${t1}`,
    `C ${x1 + dx} ${t1}, ${x2 - dx} ${t2}, ${x2} ${t2}`,
    `L ${x2} ${b2}`,
    `C ${x2 - dx} ${b2}, ${x1 + dx} ${b1}, ${x1} ${b1}`,
    "Z",
  ].join(" ");
}

function FunnelMobile({ steps, allStepKeys }: SankeyFunnelProps) {
  const maxValue = Math.max(...steps.map((s) => s.value), 1);

  const rates = steps.slice(1).map((step, i) => {
    const prev = steps[i];
    if (prev.value <= 0) return "—";
    return `${((step.value / prev.value) * 100).toFixed(0)}%`;
  });

  return (
    <div className="space-y-0.5">
      {steps.map((step, i) => {
        const color = getStepColor(step.key, allStepKeys).hex;
        const pct = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
        const globalRate =
          steps[0].value > 0 ? ((step.value / steps[0].value) * 100).toFixed(0) : "—";

        return (
          <div key={step.key}>
            <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-medium text-zinc-300 truncate">
                    {step.label}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {i === 0 ? "100%" : globalRate === "—" ? "—" : `${globalRate}%`}
                    </span>
                    <span
                      className="min-w-[44px] text-center text-sm font-bold font-mono rounded-full px-2.5 py-0.5"
                      style={{ color, backgroundColor: `${color}20` }}
                    >
                      {fmtInt(step.value)}
                    </span>
                  </div>
                </div>
                <div className="h-1 w-full rounded-full bg-zinc-700/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center justify-center gap-1.5 py-1">
                <div className="h-3 w-px bg-zinc-700" />
                <span className="text-[10px] font-mono text-zinc-500">
                  {rates[i]}
                </span>
                <div className="h-3 w-px bg-zinc-700" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SankeyFunnel({ steps, allStepKeys }: SankeyFunnelProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const count = steps.length;
  const maxLog = Math.log2(Math.max(...steps.map((s) => s.value), 1) + 1);

  const heights = useMemo(
    () => steps.map((s) => logH(s.value, maxLog)),
    [steps, maxLog],
  );
  const xs = useMemo(() => steps.map((_, i) => nX(i, count)), [steps, count]);

  const rates = useMemo(
    () =>
      steps.slice(1).map((step, i) => {
        const prev = steps[i];
        if (prev.value <= 0) return "—";
        return `${((step.value / prev.value) * 100).toFixed(0)}%`;
      }),
    [steps],
  );

  const segCount = count - 1;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="f-glow" x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>

          {Array.from({ length: segCount }, (_, i) => {
            const c1 = getStepColor(steps[i].key, allStepKeys).hex;
            const c2 = getStepColor(steps[i + 1].key, allStepKeys).hex;
            return (
              <linearGradient
                key={`g${i}`}
                id={`g${i}`}
                gradientUnits="userSpaceOnUse"
                x1={xs[i]}
                y1="0"
                x2={xs[i + 1]}
                y2="0"
              >
                <stop offset="0%" stopColor={c1} />
                <stop offset="100%" stopColor={c2} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Glow halo layer */}
        {Array.from({ length: segCount }, (_, i) => {
          const d = flowPath(xs[i], heights[i], xs[i + 1], heights[i + 1]);
          const adjacent = hovered === i || hovered === i + 1;
          const dim = hovered !== null && !adjacent;
          return (
            <path
              key={`gl${i}`}
              d={d}
              fill={`url(#g${i})`}
              filter="url(#f-glow)"
              opacity={dim ? 0.02 : 0.25}
              style={{ transition: "opacity 0.25s" }}
            />
          );
        })}

        {/* Concentric bands */}
        {BANDS.map((band, bIdx) =>
          Array.from({ length: segCount }, (_, i) => {
            const h1 = heights[i] * band.scale;
            const h2 = heights[i + 1] * band.scale;
            const d = flowPath(xs[i], h1, xs[i + 1], h2);
            const adjacent = hovered === i || hovered === i + 1;
            const dim = hovered !== null && !adjacent;
            const op = dim
              ? band.opacity * 0.08
              : adjacent
                ? Math.min(band.opacity * 1.25, 0.9)
                : band.opacity;
            return (
              <path
                key={`b${bIdx}-${i}`}
                d={d}
                fill={`url(#g${i})`}
                opacity={op}
                style={{ transition: "opacity 0.25s" }}
              />
            );
          }),
        )}

        {/* Step dividers (inner steps only) */}
        {steps.slice(1, -1).map((_, i) => (
          <line
            key={`dv${i}`}
            x1={xs[i + 1]}
            y1={FLOW_TOP - 4}
            x2={xs[i + 1]}
            y2={FLOW_BOT + 4}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Value pill badges */}
        {steps.map((step, i) => {
          const x = xs[i];
          const isActive = hovered === i;
          const dim = hovered !== null && !isActive;
          const val = fmtInt(step.value);
          const pillW = Math.max(val.length * 9.5 + 28, 58);
          const pillH = 32;
          const color = getStepColor(step.key, allStepKeys).hex;

          const pillX =
            i === 0 ? 0 : i === count - 1 ? W - pillW : x - pillW / 2;
          const textX = pillX + pillW / 2;

          return (
            <g
              key={`pill-${i}`}
              opacity={dim ? 0.18 : 1}
              style={{ transition: "opacity 0.25s" }}
            >
              <rect
                x={pillX}
                y={CY - pillH / 2}
                width={pillW}
                height={pillH}
                rx={pillH / 2}
                fill={isActive ? "rgba(24,24,27,0.97)" : "rgba(24,24,27,0.88)"}
                stroke={isActive ? color : "rgba(63,63,70,0.35)"}
                strokeWidth={isActive ? 1.2 : 0.75}
              />
              <text
                x={textX}
                y={CY + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isActive ? color : "rgba(244,244,245,0.95)"}
                fontSize="13"
                fontFamily="ui-monospace, monospace"
                fontWeight="700"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Step name labels above flow */}
        {steps.map((step, i) => {
          const dim = hovered !== null && hovered !== i;
          const anchor =
            i === 0 ? "start" : i === count - 1 ? "end" : "middle";
          return (
            <text
              key={`name-${i}`}
              x={xs[i]}
              y={CY - heights[i] / 2 - 14}
              textAnchor={anchor}
              fill={dim ? "rgba(161,161,170,0.15)" : "rgba(161,161,170,0.9)"}
              fontSize="15"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontWeight="600"
              style={{ transition: "fill 0.25s" }}
            >
              {step.label}
            </text>
          );
        })}

        {/* Conversion rates below flow */}
        <text
          x={xs[0]}
          y={CY + heights[0] / 2 + 22}
          textAnchor="start"
          fill={
            hovered !== null && hovered !== 0
              ? "rgba(161,161,170,0.1)"
              : "rgba(161,161,170,0.5)"
          }
          fontSize="13"
          fontFamily="ui-monospace, monospace"
          fontWeight="500"
          style={{ transition: "fill 0.25s" }}
        >
          100%
        </text>
        {rates.map((rate, i) => {
          const dim = hovered !== null && hovered !== i + 1;
          const isLast = i + 1 === count - 1;
          const anchor = isLast ? "end" : "middle";
          return (
            <text
              key={`rt${i}`}
              x={xs[i + 1]}
              y={CY + heights[i + 1] / 2 + 22}
              textAnchor={anchor}
              fill={dim ? "rgba(161,161,170,0.1)" : "rgba(161,161,170,0.7)"}
              fontSize="13"
              fontFamily="ui-monospace, monospace"
              fontWeight="500"
              style={{ transition: "fill 0.25s" }}
            >
              {rate}
            </text>
          );
        })}

        {/* Invisible hit areas */}
        {steps.map((_, i) => {
          const zw = W / count;
          return (
            <rect
              key={`hit${i}`}
              x={xs[i] - zw / 2}
              y={0}
              width={zw}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            />
          );
        })}
      </svg>
    </div>
  );
}

export function FunnelSection({
  data,
  isLoading,
  hiddenKeys,
}: FunnelSectionProps) {
  const t = useTranslations("dashboard.funnel");
  const allStepKeys = (data?.steps ?? [])
    .filter((s) => s.key !== "pageview")
    .map((s) => s.key);

  const visibleSteps = (data?.steps ?? []).filter(
    (s) => s.key !== "pageview" && !hiddenKeys?.has(s.key),
  );

  const stepCount = visibleSteps.length || 3;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
      <p className="mt-0.5 text-xs text-zinc-500 mb-2">
        {visibleSteps.map((s) => s.label).join(" → ") || t("fallbackSubtitle")}
      </p>

      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-lg bg-zinc-800" />
      ) : visibleSteps.length < 2 ? (
        <div className="flex h-56 items-center justify-center">
          <p className="text-xs text-zinc-700">
            {t("minStepsWarning")}
          </p>
        </div>
      ) : (
        <>
          <div className="md:hidden">
            <FunnelMobile steps={visibleSteps} allStepKeys={allStepKeys} />
          </div>
          <div className="hidden md:block">
            <SankeyFunnel steps={visibleSteps} allStepKeys={allStepKeys} />
          </div>
        </>
      )}

      {isLoading && (
        <div className="flex gap-2 mt-4 justify-center">
          {Array.from({ length: stepCount - 1 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16 bg-zinc-800 rounded" />
          ))}
        </div>
      )}
    </div>
  );
}
