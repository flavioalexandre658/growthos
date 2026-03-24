"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtCurrencyDecimal, fmtInt } from "@/utils/format";
import { useOrganization } from "@/components/providers/organization-provider";
import type { IPageScatterPoint } from "@/interfaces/dashboard.interface";

interface PagesScatterPlotProps {
  data: IPageScatterPoint[] | undefined;
  isLoading: boolean;
}

interface TooltipState {
  point: IPageScatterPoint;
  sx: number;
  sy: number;
}

const W = 900;
const H = 250;
const PAD_L = 44;
const PAD_R = 24;
const PAD_T = 30;
const PAD_B = 28;

const MAX_BUBBLE_R = 15.5;
const SCALE_PAD = 0.12;

const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function safeLog(v: number): number {
  return Math.log10(Math.max(v, 1));
}

function bubbleRadius(revenue: number, maxRevenue: number): number {
  if (maxRevenue === 0 || revenue === 0) return 3.5;
  return 3.5 + Math.sqrt(revenue / maxRevenue) * 12;
}

const Q_META = {
  escalar: { color: "#818cf8", bg: "rgba(99,102,241,0.04)" },
  manter: { color: "#34d399", bg: "rgba(52,211,153,0.04)" },
  ignorar: { color: "#71717a", bg: "transparent" },
  otimizar: { color: "#fbbf24", bg: "rgba(251,191,36,0.05)" },
} as const;

type Quadrant = keyof typeof Q_META;

const Q_ORDER: Quadrant[] = ["escalar", "manter", "otimizar", "ignorar"];

function classifyQuadrant(visits: number, conversionRate: number, medianX: number, medianY: number): Quadrant {
  const highV = visits >= medianX;
  const highC = conversionRate >= medianY;
  if (!highV && highC) return "escalar";
  if (highV && highC) return "manter";
  if (highV && !highC) return "otimizar";
  return "ignorar";
}

function PagesScatterMobile({ data, isLoading }: PagesScatterPlotProps) {
  const t = useTranslations("pages.scatter");
  const { organization } = useOrganization();
  const locale = organization?.locale ?? "pt-BR";
  const currency = organization?.currency ?? "BRL";
  const points = useMemo(() => data ?? [], [data]);

  const quadrantLabels: Record<Quadrant, string> = useMemo(() => ({
    escalar: t("quadrantEscalar"),
    manter: t("quadrantManter"),
    ignorar: t("quadrantIgnorar"),
    otimizar: t("quadrantOtimizar"),
  }), [t]);

  const { medianX, medianY } = useMemo(() => {
    if (points.length === 0) return { medianX: 1, medianY: 50 };
    const logVisits = points.map((p) => safeLog(Math.max(p.visits, 1)));
    const convRates = points.map((p) => p.conversionRate);
    const sorted = [...logVisits].sort((a, b) => a - b);
    const sortedConv = [...convRates].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return { medianX: Math.pow(10, sorted[mid]), medianY: sortedConv[mid] };
  }, [points]);

  const grouped = useMemo(() => {
    const map = new Map<Quadrant, IPageScatterPoint[]>();
    for (const q of Q_ORDER) map.set(q, []);
    for (const p of points) {
      const q = classifyQuadrant(p.visits, p.conversionRate, medianX, medianY);
      map.get(q)!.push(p);
    }
    for (const q of Q_ORDER) {
      map.get(q)!.sort((a, b) => b.revenue - a.revenue);
    }
    return map;
  }, [points, medianX, medianY]);

  const shortPath = (p: string) => (p.length > 32 ? p.slice(0, 31) + "…" : p);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
        <p className="mt-0.5 text-[10px] text-zinc-500">{t("mobileSubtitle")}</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg bg-zinc-800" />
          ))}
        </div>
      ) : points.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-zinc-600 text-sm">
          {t("noData")}
        </div>
      ) : (
        <div className="space-y-3">
          {Q_ORDER.map((q) => {
            const group = grouped.get(q)!;
            if (group.length === 0) return null;
            const meta = Q_META[q];
            const top = group.slice(0, 5);

            return (
              <div key={q}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: meta.color }}
                  />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: meta.color }}
                  >
                    {quadrantLabels[q]}
                  </span>
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {t("pageCount", { count: group.length })}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {top.map((p) => (
                    <div
                      key={p.page}
                      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-zinc-800/30 px-3 py-2"
                    >
                      <span className="text-[11px] text-zinc-300 truncate min-w-0 font-mono">
                        {shortPath(p.page)}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold font-mono text-zinc-100">
                          {fmtCurrencyDecimal(p.revenue / 100, locale, currency)}
                        </span>
                        <span
                          className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                          style={{ color: meta.color, backgroundColor: `${meta.color}20` }}
                        >
                          {p.conversionRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {group.length > 5 && (
                    <p className="text-[10px] text-zinc-600 text-center py-0.5">
                      {t("morePages", { count: group.length - 5 })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PagesScatterPlot({ data, isLoading }: PagesScatterPlotProps) {
  const t = useTranslations("pages.scatter");
  const { organization } = useOrganization();
  const locale = organization?.locale ?? "pt-BR";
  const currency = organization?.currency ?? "BRL";
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const quadrantLabels: Record<Quadrant, string> = useMemo(() => ({
    escalar: t("quadrantEscalar"),
    manter: t("quadrantManter"),
    ignorar: t("quadrantIgnorar"),
    otimizar: t("quadrantOtimizar"),
  }), [t]);

  const points = useMemo(() => data ?? [], [data]);

  const { minLogX, maxLogX, maxY, medianX, medianY, maxRevenue } = useMemo(() => {
    if (points.length === 0)
      return { minLogX: 0, maxLogX: 1, maxY: 100, medianX: 1, medianY: 50, maxRevenue: 0 };
    const logVisits = points.map((p) => safeLog(Math.max(p.visits, 1)));
    const convRates = points.map((p) => p.conversionRate);
    const sorted = [...logVisits].sort((a, b) => a - b);
    const sortedConv = [...convRates].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const rawMinLog = sorted[0];
    const rawMaxLog = sorted[sorted.length - 1];
    const logRange = rawMaxLog - rawMinLog || 1;
    const rawMaxY = Math.max(...convRates, 1);
    return {
      minLogX: rawMinLog - logRange * SCALE_PAD,
      maxLogX: rawMaxLog + logRange * SCALE_PAD,
      maxY: rawMaxY * (1 + SCALE_PAD),
      medianX: Math.pow(10, sorted[mid]),
      medianY: sortedConv[mid],
      maxRevenue: Math.max(...points.map((p) => p.revenue), 0),
    };
  }, [points]);

  const toSx = useCallback(
    (visits: number) => {
      const range = maxLogX - minLogX;
      if (range === 0) return PAD_L + PLOT_W / 2;
      return PAD_L + ((safeLog(visits) - minLogX) / range) * PLOT_W;
    },
    [minLogX, maxLogX]
  );

  const toSy = useCallback(
    (conv: number) => PAD_T + PLOT_H - (conv / Math.max(maxY, 0.01)) * PLOT_H,
    [maxY]
  );

  const mSx = toSx(medianX);
  const mSy = toSy(medianY);

  const getQuadrant = useCallback(
    (visits: number, conv: number): Quadrant => {
      const highV = visits >= medianX;
      const highC = conv >= medianY;
      if (!highV && highC) return "escalar";
      if (highV && highC) return "manter";
      if (highV && !highC) return "otimizar";
      return "ignorar";
    },
    [medianX, medianY]
  );

  const handleMouse = useCallback(
    (point: IPageScatterPoint, e: React.MouseEvent<SVGElement>) => {
      setHovered(point.page);
      const svg = (e.currentTarget as SVGElement).closest("svg");
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      setTooltip({
        point,
        sx: ((e.clientX - r.left) / r.width) * W,
        sy: ((e.clientY - r.top) / r.height) * H,
      });
    },
    []
  );

  const yTicks = useMemo(() => {
    const step = maxY <= 5 ? 1 : maxY <= 20 ? 5 : maxY <= 50 ? 10 : maxY <= 100 ? 25 : 50;
    const ticks: number[] = [];
    for (let t = 0; t <= maxY + step * 0.5; t += step) ticks.push(t);
    return ticks.slice(0, 6);
  }, [maxY]);

  const xTicks = useMemo(() => {
    if (points.length === 0) return [];
    const ticks: number[] = [];
    for (let l = Math.floor(minLogX); l <= Math.ceil(maxLogX); l++) ticks.push(Math.pow(10, l));
    return ticks;
  }, [minLogX, maxLogX, points.length]);

  const shortPath = (p: string) => (p.length > 36 ? p.slice(0, 35) + "…" : p);

  return (
    <>
      <div className="md:hidden">
        <PagesScatterMobile data={data} isLoading={isLoading} />
      </div>
      <div className="hidden md:block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
          <p className="mt-0.5 text-[10px] text-zinc-500">
            {t("desktopSubtitle")}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
          {(["escalar", "manter", "ignorar", "otimizar"] as Quadrant[]).map((q) => (
            <span key={q} className="flex items-center gap-1">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: Q_META[q].color }}
              />
              <span className="text-[9px] text-zinc-500 font-medium">{quadrantLabels[q]}</span>
            </span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-44 w-full rounded-lg bg-zinc-800" />
      ) : points.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
          {t("noData")}
        </div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => { setTooltip(null); setHovered(null); }}
          >
            <defs>
              <clipPath id="sc-clip">
                <rect
                  x={PAD_L - MAX_BUBBLE_R}
                  y={PAD_T - MAX_BUBBLE_R}
                  width={PLOT_W + MAX_BUBBLE_R * 2}
                  height={PLOT_H + MAX_BUBBLE_R * 2}
                />
              </clipPath>
              <filter id="sc-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
              </filter>
              {(["escalar", "manter", "ignorar", "otimizar"] as Quadrant[]).map((q) => (
                <radialGradient key={`rg-${q}`} id={`sc-rg-${q}`} cx="40%" cy="40%" r="65%">
                  <stop offset="0%" stopColor={Q_META[q].color} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={Q_META[q].color} stopOpacity={0.45} />
                </radialGradient>
              ))}
            </defs>

            <rect
              x={PAD_L}
              y={PAD_T}
              width={PLOT_W / 2}
              height={PLOT_H / 2}
              fill={Q_META.escalar.bg}
            />
            <rect
              x={PAD_L + PLOT_W / 2}
              y={PAD_T}
              width={PLOT_W / 2}
              height={PLOT_H / 2}
              fill={Q_META.manter.bg}
            />
            <rect
              x={PAD_L + PLOT_W / 2}
              y={PAD_T + PLOT_H / 2}
              width={PLOT_W / 2}
              height={PLOT_H / 2}
              fill={Q_META.otimizar.bg}
            />

            {yTicks.map((tick) => {
              const y = toSy(tick);
              return (
                <g key={`yt-${tick}`}>
                  <line
                    x1={PAD_L}
                    y1={y}
                    x2={PAD_L + PLOT_W}
                    y2={y}
                    stroke="rgba(63,63,70,0.2)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={PAD_L - 5}
                    y={y + 3}
                    textAnchor="end"
                    fill="rgba(113,113,122,0.55)"
                    fontSize="8"
                    fontFamily="ui-monospace, monospace"
                  >
                    {tick}%
                  </text>
                </g>
              );
            })}

            {xTicks.map((tick) => {
              const x = toSx(tick);
              return (
                <g key={`xt-${tick}`}>
                  <line
                    x1={x}
                    y1={PAD_T}
                    x2={x}
                    y2={PAD_T + PLOT_H}
                    stroke="rgba(63,63,70,0.2)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={x}
                    y={PAD_T + PLOT_H + 12}
                    textAnchor="middle"
                    fill="rgba(113,113,122,0.55)"
                    fontSize="8"
                    fontFamily="ui-monospace, monospace"
                  >
                    {tick >= 1000 ? `${tick / 1000}k` : String(tick)}
                  </text>
                </g>
              );
            })}

            <line
              x1={mSx} y1={PAD_T} x2={mSx} y2={PAD_T + PLOT_H}
              stroke="rgba(113,113,122,0.25)" strokeWidth="0.75" strokeDasharray="4,3"
            />
            <line
              x1={PAD_L} y1={mSy} x2={PAD_L + PLOT_W} y2={mSy}
              stroke="rgba(113,113,122,0.25)" strokeWidth="0.75" strokeDasharray="4,3"
            />

            {(["escalar", "manter", "ignorar", "otimizar"] as Quadrant[]).map((q) => {
              const isTop = q === "escalar" || q === "manter";
              const isLeft = q === "escalar" || q === "ignorar";
              const x = isLeft ? PAD_L + 6 : PAD_L + PLOT_W - 6;
              const y = isTop ? PAD_T + 11 : PAD_T + PLOT_H - 5;
              const anchor = isLeft ? "start" : "end";
              return (
                <text
                  key={`ql-${q}`}
                  x={x} y={y}
                  textAnchor={anchor}
                  fill={Q_META[q].color}
                  fillOpacity={0.4}
                  fontSize="8"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fontWeight="600"
                  letterSpacing="0.02em"
                >
                  {quadrantLabels[q].toUpperCase()}
                </text>
              );
            })}

            <text
              x={PAD_L + PLOT_W / 2}
              y={H - 2}
              textAnchor="middle"
              fill="rgba(113,113,122,0.4)"
              fontSize="7"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {t("xAxisLabel")}
            </text>

            <g clipPath="url(#sc-clip)">
              {points.map((point) => {
                const sx = toSx(point.visits);
                const sy = toSy(point.conversionRate);
                const r = bubbleRadius(point.revenue, maxRevenue);
                const q = getQuadrant(point.visits, point.conversionRate);
                const isHov = hovered === point.page;
                const isDim = hovered !== null && !isHov;

                return (
                  <g key={point.page}>
                    {isHov && (
                      <circle
                        cx={sx} cy={sy} r={r + 4}
                        fill={Q_META[q].color}
                        filter="url(#sc-glow)"
                        opacity={0.4}
                      />
                    )}
                    <circle
                      cx={sx}
                      cy={sy}
                      r={isHov ? r + 1.5 : r}
                      fill={`url(#sc-rg-${q})`}
                      stroke={isHov ? Q_META[q].color : "rgba(0,0,0,0.3)"}
                      strokeWidth={isHov ? 1.2 : 0.5}
                      opacity={isDim ? 0.12 : 1}
                      style={{ transition: "opacity 0.15s" }}
                      className="cursor-pointer"
                      onMouseEnter={(e) => handleMouse(point, e)}
                      onMouseMove={(e) => handleMouse(point, e)}
                      onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                    />
                  </g>
                );
              })}
            </g>

            {tooltip && (() => {
              const ttW = 200;
              const ttH = 70;
              const pad = 10;
              let ttX = tooltip.sx + 14;
              let ttY = tooltip.sy - ttH / 2;
              if (ttX + ttW > W) ttX = tooltip.sx - ttW - 14;
              if (ttY < 0) ttY = 4;
              if (ttY + ttH > H) ttY = H - ttH - 4;
              const p = tooltip.point;
              const q = getQuadrant(p.visits, p.conversionRate);
              const c = Q_META[q].color;

              return (
                <g>
                  <rect
                    x={ttX} y={ttY} width={ttW} height={ttH} rx={6}
                    fill="rgba(9,9,11,0.96)"
                    stroke={c} strokeWidth={0.75} strokeOpacity={0.5}
                  />
                  <rect
                    x={ttX} y={ttY} width={3} height={ttH} rx={1}
                    fill={c} fillOpacity={0.7}
                  />
                  <text
                    x={ttX + pad + 4} y={ttY + 14}
                    fill="rgba(244,244,245,0.8)"
                    fontSize="9" fontFamily="ui-monospace, monospace" fontWeight="500"
                  >
                    {shortPath(p.page)}
                  </text>
                  <text
                    x={ttX + pad + 4} y={ttY + 30}
                    fill="rgba(255,255,255,0.95)"
                    fontSize="13" fontFamily="ui-monospace, monospace" fontWeight="700"
                  >
                    {fmtCurrencyDecimal(p.revenue / 100, locale, currency)}
                  </text>
                  <text
                    x={ttX + ttW - pad} y={ttY + 30} textAnchor="end"
                    fill={c} fontSize="10"
                    fontFamily="ui-monospace, monospace" fontWeight="600"
                  >
                    {p.conversionRate.toFixed(1)}%
                  </text>
                  <text
                    x={ttX + pad + 4} y={ttY + 46}
                    fill="rgba(161,161,170,0.55)" fontSize="9"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {t("visitsLabel", { count: fmtInt(p.visits) })}
                  </text>
                  <text
                    x={ttX + ttW - pad} y={ttY + 46} textAnchor="end"
                    fill="rgba(161,161,170,0.45)" fontSize="8"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {quadrantLabels[q]}
                  </text>
                  <line
                    x1={ttX + pad + 4} y1={ttY + 54}
                    x2={ttX + ttW - pad} y2={ttY + 54}
                    stroke="rgba(63,63,70,0.4)" strokeWidth="0.5"
                  />
                  <text
                    x={ttX + pad + 4} y={ttY + 64}
                    fill="rgba(113,113,122,0.5)" fontSize="8"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {t("ticketLabel")}{p.visits > 0
                      ? fmtCurrencyDecimal(p.revenue / 100 / Math.max(p.visits * (p.conversionRate / 100), 1), locale, currency)
                      : "—"}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      )}
    </div>
    </>
  );
}
