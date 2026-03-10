"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal, fmtBRLCompact, fmtInt } from "@/utils/format";
import { getChannelColor, getChannelName } from "@/utils/channel-colors";
import type { IChannelData } from "@/interfaces/dashboard.interface";

interface ChannelsTreemapProps {
  data: IChannelData[] | undefined;
  isLoading: boolean;
}

interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
  channel: string;
  revenue: number;
  purchases: number;
  conversion_rate: string;
  ticket_medio: number;
  color: string;
  percentage: number;
}

const GAP = 3;
const R = 6;
const PAD = 10;

type SquarifyItem = {
  value: number;
  channel: string;
  purchases: number;
  conversion_rate: string;
  ticket_medio: number;
  color: string;
  percentage: number;
};

function squarify(
  items: SquarifyItem[],
  x: number,
  y: number,
  w: number,
  h: number
): (SquarifyItem & { x: number; y: number; w: number; h: number })[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ x, y, w, h, ...items[0] }];

  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(items.length)));
    const rows = Math.ceil(items.length / cols);
    return items.map((item, idx) => ({
      x: x + (idx % cols) * (w / cols),
      y: y + Math.floor(idx / cols) * (h / rows),
      w: w / cols,
      h: h / rows,
      ...item,
    }));
  }

  const result: ReturnType<typeof squarify> = [];
  let remaining = [...items];
  let rx = x,
    ry = y,
    rw = w,
    rh = h;
  let remTotal = total;

  while (remaining.length > 0) {
    const landscape = rw >= rh;
    const stripDim = landscape ? rh : rw;
    const stripItems: typeof remaining = [];
    let stripTotal = 0;
    let prevWorstRatio = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const newTotal = stripTotal + candidate.value;
      const stripArea = (newTotal / remTotal) * (rw * rh);
      const stripW = stripArea / stripDim;

      let worstRatio = 0;
      for (let j = 0; j <= i; j++) {
        const v = j < i ? stripItems[j].value : candidate.value;
        const itemH = (v / newTotal) * stripDim;
        const ratio = Math.max(stripW / itemH, itemH / stripW);
        if (ratio > worstRatio) worstRatio = ratio;
      }

      if (stripItems.length > 0 && worstRatio > prevWorstRatio) break;
      stripItems.push(candidate);
      stripTotal = newTotal;
      prevWorstRatio = worstRatio;
    }

    const stripArea = (stripTotal / remTotal) * (rw * rh);
    const stripW = stripArea / stripDim;
    let cursor = landscape ? ry : rx;

    for (const item of stripItems) {
      const frac = item.value / stripTotal;
      const itemLen = frac * stripDim;
      if (landscape) {
        result.push({ x: rx, y: cursor, w: stripW, h: itemLen, ...item });
        cursor += itemLen;
      } else {
        result.push({ x: cursor, y: ry, w: itemLen, h: stripW, ...item });
        cursor += itemLen;
      }
    }

    remaining = remaining.slice(stripItems.length);
    remTotal -= stripTotal;
    if (landscape) {
      rx += stripW;
      rw -= stripW;
    } else {
      ry += stripW;
      rh -= stripW;
    }
  }

  return result;
}

function buildRects(
  data: IChannelData[],
  totalW: number,
  totalH: number
): TreemapRect[] {
  const withRevenue = data
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = withRevenue.reduce((s, c) => s + c.revenue, 0);

  const mainItems: SquarifyItem[] = withRevenue.map((c, i) => ({
    value: c.revenue,
    channel: c.channel,
    purchases: c.steps["purchase"] ?? 0,
    conversion_rate: c.conversion_rate,
    ticket_medio: c.ticket_medio,
    color: getChannelColor(c.channel, i),
    percentage:
      totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0,
  }));

  const rawRects = squarify(mainItems, 0, 0, totalW, totalH);

  return rawRects.map((r) => ({
    x: r.x + GAP / 2,
    y: r.y + GAP / 2,
    w: r.w - GAP,
    h: r.h - GAP,
    channel: r.channel,
    revenue: r.value,
    purchases: r.purchases,
    conversion_rate: r.conversion_rate,
    ticket_medio: r.ticket_medio,
    color: r.color,
    percentage: r.percentage,
  }));
}

type BlockTier = "large" | "medium" | "small" | "minimal";

function getTier(w: number, h: number): BlockTier {
  if (w >= 160 && h >= 90) return "large";
  if (w >= 80 && h >= 55) return "medium";
  if (w >= 40 && h >= 28) return "small";
  return "minimal";
}

interface TooltipData {
  rect: TreemapRect;
  mouseX: number;
  mouseY: number;
}

function ChannelsTreemapMobile({ data, isLoading }: ChannelsTreemapProps) {
  const t = useTranslations("channels.treemap");
  const locale = useLocale();
  const sorted = useMemo(
    () => (data ?? []).filter((c) => c.revenue > 0).sort((a, b) => b.revenue - a.revenue),
    [data]
  );
  const totalRevenue = useMemo(
    () => sorted.reduce((s, c) => s + c.revenue, 0),
    [sorted]
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
          <p className="mt-0.5 text-[10px] text-zinc-500">{t("mobileSubtitle")}</p>
        </div>
        {sorted.length > 0 && (
          <span className="text-[10px] text-zinc-600 font-mono">
            {t("channelCount", { count: sorted.length })}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg bg-zinc-800" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex items-center justify-center h-24 text-zinc-600 text-sm">
          {t("noData")}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((channel, idx) => {
            const color = getChannelColor(channel.channel, idx);
            const name = getChannelName(channel.channel, locale);
            const pct = totalRevenue > 0 ? Math.round((channel.revenue / totalRevenue) * 100) : 0;
            const purchases = channel.steps["purchase"] ?? 0;

            return (
              <div
                key={channel.channel}
                className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-800/30 px-3 py-2.5"
              >
                <div
                  className="shrink-0 w-1 self-stretch rounded-full"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-zinc-200 truncate">{name}</span>
                    <span
                      className="shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                      style={{ color, backgroundColor: `${color}20` }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-sm font-bold font-mono text-zinc-100">
                      {fmtBRLDecimal(channel.revenue / 100)}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                      {t("purchasesConv", { count: fmtInt(purchases), rate: channel.conversion_rate })}
                    </span>
                  </div>
                  <div className="mt-1.5 h-0.5 rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ChannelsTreemap({ data, isLoading }: ChannelsTreemapProps) {
  const t = useTranslations("channels.treemap");
  const locale = useLocale();
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const W = 900;
  const H = 240;

  const withRevenue = useMemo(
    () => (data ?? []).filter((c) => c.revenue > 0),
    [data]
  );
  const rects = useMemo(() => {
    if (withRevenue.length === 0) return [];
    return buildRects(data ?? [], W, H);
  }, [data, withRevenue.length]);

  const handleMouseMove = useCallback(
    (channel: string, rect: TreemapRect, e: React.MouseEvent<SVGElement>) => {
      setHoveredChannel(channel);
      const svgEl = (e.currentTarget as SVGElement).closest("svg");
      if (!svgEl) return;
      const svgRect = svgEl.getBoundingClientRect();
      const scaleX = W / svgRect.width;
      const scaleY = H / svgRect.height;
      setTooltip({
        rect,
        mouseX: (e.clientX - svgRect.left) * scaleX,
        mouseY: (e.clientY - svgRect.top) * scaleY,
      });
    },
    []
  );

  return (
    <>
      <div className="md:hidden">
        <ChannelsTreemapMobile data={data} isLoading={isLoading} />
      </div>
      <div className="hidden md:block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">{t("title")}</h3>
          <p className="mt-0.5 text-[10px] text-zinc-500">
            {t("desktopSubtitle")}
          </p>
        </div>
        {withRevenue.length > 0 && (
          <span className="text-[10px] text-zinc-600 font-mono">
            {t("channelCount", { count: withRevenue.length })}
          </span>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-lg bg-zinc-800" />
      ) : rects.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
          {t("noData")}
        </div>
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => {
              setHoveredChannel(null);
              setTooltip(null);
            }}
          >
            <defs>
              {rects.map((rect) => (
                <clipPath key={`clip-${rect.channel}`} id={`clip-${rect.channel}`}>
                  <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={R} />
                </clipPath>
              ))}
              {rects.map((rect) => (
                <linearGradient
                  key={`lg-${rect.channel}`}
                  id={`tmg-${rect.channel}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={rect.color} stopOpacity={0.5} />
                  <stop offset="50%" stopColor={rect.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={rect.color} stopOpacity={0.38} />
                </linearGradient>
              ))}
              {rects.map((rect) => (
                <radialGradient
                  key={`rg-${rect.channel}`}
                  id={`tmrg-${rect.channel}`}
                  cx="15%"
                  cy="15%"
                  r="85%"
                >
                  <stop offset="0%" stopColor={rect.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={rect.color} stopOpacity={0.05} />
                </radialGradient>
              ))}
            </defs>

            {rects.map((rect) => {
              const isHov = hoveredChannel === rect.channel;
              const isDim = hoveredChannel !== null && !isHov;
              const name = getChannelName(rect.channel, locale);
              const tier = getTier(rect.w, rect.h);

              const maxChars = Math.floor((rect.w - PAD * 2) / 6.5);
              const displayName =
                name.length > maxChars
                  ? name.slice(0, Math.max(2, maxChars - 1)) + "…"
                  : name;

              const revenueCompact = fmtBRLCompact(rect.revenue / 100);
              const revenueDecimal = fmtBRLDecimal(rect.revenue / 100);

              return (
                <g
                  key={rect.channel}
                  opacity={isDim ? 0.2 : 1}
                  style={{ transition: "opacity 0.2s ease-out" }}
                  clipPath={`url(#clip-${rect.channel})`}
                  onMouseEnter={(e) => handleMouseMove(rect.channel, rect, e)}
                  onMouseMove={(e) => handleMouseMove(rect.channel, rect, e)}
                  onMouseLeave={() => {
                    setHoveredChannel(null);
                    setTooltip(null);
                  }}
                  className="cursor-pointer"
                >
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx={R}
                    fill={`url(#tmg-${rect.channel})`}
                  />
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx={R}
                    fill={`url(#tmrg-${rect.channel})`}
                  />
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    rx={R}
                    fill="none"
                    stroke={isHov ? rect.color : "rgba(255,255,255,0.06)"}
                    strokeWidth={isHov ? 1.5 : 1}
                    style={{ transition: "stroke 0.2s" }}
                  />

                  {isHov && (
                    <rect
                      x={rect.x}
                      y={rect.y}
                      width={rect.w}
                      height={rect.h}
                      rx={R}
                      fill={rect.color}
                      fillOpacity={0.12}
                    />
                  )}

                  {tier === "large" && (
                    <>
                      <text
                        x={rect.x + PAD}
                        y={rect.y + PAD + 9}
                        fill="rgba(244,244,245,0.55)"
                        fontSize="11"
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                        fontWeight="500"
                      >
                        {displayName}
                      </text>
                      <text
                        x={rect.x + PAD}
                        y={rect.y + PAD + 32}
                        fill="rgba(255,255,255,0.95)"
                        fontSize="20"
                        fontFamily="ui-monospace, monospace"
                        fontWeight="700"
                      >
                        {revenueDecimal}
                      </text>
                      <text
                        x={rect.x + PAD}
                        y={rect.y + PAD + 48}
                        fill={rect.color}
                        fontSize="11"
                        fontFamily="ui-monospace, monospace"
                        fontWeight="500"
                        opacity={0.9}
                      >
                        {t("percentRevenue", { pct: rect.percentage })}
                      </text>
                      {rect.h >= 100 && (
                        <text
                          x={rect.x + PAD}
                          y={rect.y + PAD + 64}
                          fill="rgba(244,244,245,0.38)"
                          fontSize="10"
                          fontFamily="ui-sans-serif, system-ui, sans-serif"
                        >
                          {t("purchasesConv", { count: fmtInt(rect.purchases), rate: rect.conversion_rate })}
                        </text>
                      )}
                    </>
                  )}

                  {tier === "medium" && (
                    <>
                      <text
                        x={rect.x + PAD}
                        y={rect.y + PAD + 8}
                        fill="rgba(244,244,245,0.5)"
                        fontSize="10"
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                        fontWeight="500"
                      >
                        {displayName}
                      </text>
                      <text
                        x={rect.x + PAD}
                        y={rect.y + PAD + 26}
                        fill="rgba(255,255,255,0.92)"
                        fontSize="14"
                        fontFamily="ui-monospace, monospace"
                        fontWeight="700"
                      >
                        {rect.w < 140 ? revenueCompact : revenueDecimal}
                      </text>
                      {rect.h >= 65 && (
                        <text
                          x={rect.x + PAD}
                          y={rect.y + PAD + 40}
                          fill={rect.color}
                          fontSize="10"
                          fontFamily="ui-monospace, monospace"
                          fontWeight="500"
                          opacity={0.8}
                        >
                          {rect.percentage}%
                        </text>
                      )}
                    </>
                  )}

                  {tier === "small" && (
                    <text
                      x={rect.x + rect.w / 2}
                      y={rect.y + rect.h / 2 + 3}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.8)"
                      fontSize="9"
                      fontFamily="ui-monospace, monospace"
                      fontWeight="600"
                    >
                      {revenueCompact}
                    </text>
                  )}
                </g>
              );
            })}

            {tooltip && (
              <g>
                {(() => {
                  const tier = getTier(tooltip.rect.w, tooltip.rect.h);
                  if (tier === "large") return null;

                  const ttW = 180;
                  const ttH = 72;
                  const pad = 10;
                  let ttX = tooltip.mouseX + 14;
                  let ttY = tooltip.mouseY - ttH / 2;
                  if (ttX + ttW > W) ttX = tooltip.mouseX - ttW - 14;
                  if (ttY < 0) ttY = 4;
                  if (ttY + ttH > H) ttY = H - ttH - 4;

                  const r = tooltip.rect;
                  const tName = getChannelName(r.channel, locale);

                  return (
                    <>
                      <rect
                        x={ttX}
                        y={ttY}
                        width={ttW}
                        height={ttH}
                        rx={6}
                        fill="rgba(9,9,11,0.96)"
                        stroke={r.color}
                        strokeWidth={1}
                        strokeOpacity={0.35}
                      />
                      <text
                        x={ttX + pad}
                        y={ttY + 16}
                        fill="rgba(244,244,245,0.85)"
                        fontSize="10"
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                        fontWeight="600"
                      >
                        {tName}
                      </text>
                      <text
                        x={ttX + pad}
                        y={ttY + 33}
                        fill="rgba(255,255,255,0.95)"
                        fontSize="13"
                        fontFamily="ui-monospace, monospace"
                        fontWeight="700"
                      >
                        {fmtBRLDecimal(r.revenue / 100)}
                      </text>
                      <text
                        x={ttX + pad}
                        y={ttY + 48}
                        fill={r.color}
                        fontSize="9"
                        fontFamily="ui-monospace, monospace"
                        opacity={0.85}
                      >
                        {t("percentRevenue", { pct: r.percentage })}
                      </text>
                      <text
                        x={ttX + pad}
                        y={ttY + 63}
                        fill="rgba(161,161,170,0.55)"
                        fontSize="9"
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                      >
                        {t("purchasesConv", { count: fmtInt(r.purchases), rate: r.conversion_rate })}
                      </text>
                    </>
                  );
                })()}
              </g>
            )}
          </svg>
        </div>
      )}
    </div>
    </>
  );
}
