"use client";

import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal, fmtInt } from "@/utils/format";
import type { IMrrOverview } from "@/interfaces/mrr.interface";

interface SubscriberFlowSankeyProps {
  data: IMrrOverview | null | undefined;
  isLoading: boolean;
}

const W = 900;
const H = 240;
const FLOW_TOP = 24;
const FLOW_BOT = H - 24;
const FLOW_H = FLOW_BOT - FLOW_TOP;
const CY = FLOW_TOP + FLOW_H / 2;

const BANDS = [
  { scale: 0.72, opacity: 0.08 },
  { scale: 0.60, opacity: 0.13 },
  { scale: 0.48, opacity: 0.22 },
  { scale: 0.36, opacity: 0.42 },
  { scale: 0.38, opacity: 0.72 },
];

const COLORS = {
  new: "#22c55e",
  expansion: "#06b6d4",
  reactivated: "#8b5cf6",
  active: "#6366f1",
  canceled: "#ef4444",
  pastdue: "#f97316",
};

function logH(value: number, maxLog: number): number {
  const MIN = FLOW_H * 0.08;
  if (value <= 0 || maxLog <= 0) return MIN;
  return MIN + (Math.log2(value + 1) / maxLog) * (FLOW_H - MIN);
}

function flowPath(x1: number, h1: number, x2: number, h2: number, cy1: number, cy2: number): string {
  const t1 = cy1 - h1 / 2;
  const b1 = cy1 + h1 / 2;
  const t2 = cy2 - h2 / 2;
  const b2 = cy2 + h2 / 2;
  const dx = (x2 - x1) * 0.42;
  return [
    `M ${x1} ${t1}`,
    `C ${x1 + dx} ${t1}, ${x2 - dx} ${t2}, ${x2} ${t2}`,
    `L ${x2} ${b2}`,
    `C ${x2 - dx} ${b2}, ${x1 + dx} ${b1}, ${x1} ${b1}`,
    "Z",
  ].join(" ");
}

interface FlowLink {
  key: string;
  label: string;
  value: number;
  color1: string;
  color2: string;
  x1: number;
  x2: number;
  cy1: number;
  cy2: number;
  isInput: boolean;
}

function buildFlowData(data: IMrrOverview) {
  const active = data.activeSubscriptions;
  const newMrr = data.totalNewMrr ?? 0;
  const expansionMrr = data.totalExpansionMrr ?? 0;
  const churnedMrr = data.totalChurnedMrr ?? 0;
  const pastDue = data.pastDueSubscriptions ?? 0;

  const newCount = active > 0 && newMrr > 0 ? Math.max(1, Math.round(active * 0.15)) : 0;
  const expansionCount = expansionMrr > 0 ? Math.max(1, Math.round(active * 0.05)) : 0;
  const churnedCount = churnedMrr > 0 ? Math.max(1, Math.round(active * (data.churnRate / 100))) : 0;

  return {
    inputs: [
      { key: "new", label: "Novos", value: newCount, color: COLORS.new, offsetY: -FLOW_H * 0.26 },
      { key: "expansion", label: "Expansão", value: expansionCount, color: COLORS.expansion, offsetY: 0 },
      { key: "reactivated", label: "Reativados", value: 0, color: COLORS.reactivated, offsetY: FLOW_H * 0.26 },
    ],
    center: { value: active, color: COLORS.active },
    outputs: [
      { key: "canceled", label: "Cancelados", value: churnedCount, color: COLORS.canceled, offsetY: -FLOW_H * 0.22 },
      { key: "pastdue", label: "Inadimplentes", value: pastDue, color: COLORS.pastdue, offsetY: FLOW_H * 0.22 },
    ],
  };
}

function SubscriberSankeyInner({ data }: { data: IMrrOverview }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const flow = useMemo(() => buildFlowData(data), [data]);

  const allValues = [
    flow.center.value,
    ...flow.inputs.map((n) => n.value),
    ...flow.outputs.map((n) => n.value),
  ];
  const maxLog = Math.log2(Math.max(...allValues, 1) + 1);

  const xLeft = 100;
  const xCenter = W / 2;
  const xRight = W - 100;

  const links: FlowLink[] = useMemo(() => {
    const result: FlowLink[] = [];
    flow.inputs.forEach((node) => {
      result.push({
        key: node.key,
        label: node.label,
        value: node.value,
        color1: node.color,
        color2: flow.center.color,
        x1: xLeft,
        x2: xCenter,
        cy1: CY + node.offsetY,
        cy2: CY,
        isInput: true,
      });
    });
    flow.outputs.forEach((node) => {
      result.push({
        key: node.key,
        label: node.label,
        value: node.value,
        color1: flow.center.color,
        color2: node.color,
        x1: xCenter,
        x2: xRight,
        cy1: CY,
        cy2: CY + node.offsetY,
        isInput: false,
      });
    });
    return result;
  }, [flow, xLeft, xCenter, xRight]);

  const allNodes = [
    ...flow.inputs.map((n) => ({ ...n, side: "left" as const, cx: xLeft, cy: CY + n.offsetY })),
    { key: "active", label: "Base Ativa", value: flow.center.value, color: flow.center.color, side: "center" as const, cx: xCenter, cy: CY, offsetY: 0 },
    ...flow.outputs.map((n) => ({ ...n, side: "right" as const, cx: xRight, cy: CY + n.offsetY })),
  ];

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="sf-glow" x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
          {links.map((link) => (
            <linearGradient
              key={`g-${link.key}`}
              id={`g-${link.key}`}
              gradientUnits="userSpaceOnUse"
              x1={link.x1}
              y1="0"
              x2={link.x2}
              y2="0"
            >
              <stop offset="0%" stopColor={link.color1} />
              <stop offset="100%" stopColor={link.color2} />
            </linearGradient>
          ))}
        </defs>

        {links.map((link) => {
          const h1 = logH(link.value, maxLog);
          const h2 = Math.max(h1 * 0.8, FLOW_H * 0.05);
          const d = flowPath(link.x1, h1, link.x2, h2, link.cy1, link.cy2);
          const adjacent = hovered === link.key;
          const dim = hovered !== null && !adjacent;
          return (
            <path
              key={`glow-${link.key}`}
              d={d}
              fill={`url(#g-${link.key})`}
              filter="url(#sf-glow)"
              opacity={dim ? 0.02 : 0.25}
              style={{ transition: "opacity 0.25s" }}
            />
          );
        })}

        {BANDS.map((band, bIdx) =>
          links.map((link) => {
            const h1 = logH(link.value, maxLog) * band.scale;
            const h2 = Math.max(logH(link.value, maxLog) * 0.8, FLOW_H * 0.05) * band.scale;
            const d = flowPath(link.x1, h1, link.x2, h2, link.cy1, link.cy2);
            const adjacent = hovered === link.key;
            const dim = hovered !== null && !adjacent;
            const op = dim
              ? band.opacity * 0.08
              : adjacent
                ? Math.min(band.opacity * 1.25, 0.9)
                : band.opacity;
            return (
              <path
                key={`b${bIdx}-${link.key}`}
                d={d}
                fill={`url(#g-${link.key})`}
                opacity={op}
                style={{ transition: "opacity 0.25s" }}
              />
            );
          })
        )}

        <line x1={xLeft} y1={FLOW_TOP - 4} x2={xLeft} y2={FLOW_BOT + 4} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <line x1={xCenter} y1={FLOW_TOP - 4} x2={xCenter} y2={FLOW_BOT + 4} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <line x1={xRight} y1={FLOW_TOP - 4} x2={xRight} y2={FLOW_BOT + 4} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

        {allNodes.filter((n) => n.side !== "center").map((node) => {
          const isActive = hovered === node.key;
          const dim = hovered !== null && hovered !== node.key;

          const val = fmtInt(node.value);
          const pillW = Math.max(val.length * 8.5 + 24, 52);
          const pillH = 28;

          const pillX =
            node.side === "left"
              ? Math.max(0, node.cx - pillW - 12)
              : Math.min(W - pillW, node.cx + 12);

          const textX = pillX + pillW / 2;

          return (
            <g
              key={`node-${node.key}`}
              opacity={dim ? 0.18 : 1}
              style={{ transition: "opacity 0.25s" }}
            >
              <text
                x={textX}
                y={node.cy - 20}
                textAnchor="middle"
                fill={dim ? "rgba(161,161,170,0.15)" : "rgba(161,161,170,0.85)"}
                fontSize="9"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontWeight="500"
                style={{ transition: "fill 0.25s" }}
              >
                {node.label}
              </text>
              <rect
                x={pillX}
                y={node.cy - pillH / 2}
                width={pillW}
                height={pillH}
                rx={pillH / 2}
                fill={isActive ? "rgba(24,24,27,0.97)" : "rgba(24,24,27,0.88)"}
                stroke={isActive ? node.color : "rgba(63,63,70,0.35)"}
                strokeWidth={isActive ? 1.2 : 0.75}
              />
              <text
                x={textX}
                y={node.cy + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isActive ? node.color : "rgba(244,244,245,0.95)"}
                fontSize="12"
                fontFamily="ui-monospace, monospace"
                fontWeight="700"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Center node — prominent subscriber count */}
        {(() => {
          //const centerH = logH(flow.center.value, maxLog);
          const dim = hovered !== null && hovered !== "active";
          const isActive = hovered === "active";
          const cardW = 96;
          const cardH = 52;
          return (
            <g opacity={dim ? 0.25 : 1} style={{ transition: "opacity 0.25s" }}>
              <rect
                x={xCenter - cardW / 2}
                y={CY - cardH / 2}
                width={cardW}
                height={cardH}
                rx={10}
                fill="rgba(18,18,20,0.95)"
                stroke={isActive ? COLORS.active : "rgba(99,102,241,0.35)"}
                strokeWidth={isActive ? 1.5 : 1}
              />
              <text
                x={xCenter}
                y={CY - cardH / 2 - 8}
                textAnchor="middle"
                fill="rgba(161,161,170,0.7)"
                fontSize="9"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontWeight="600"
                letterSpacing="0.05em"
              >
                BASE ATIVA
              </text>
              <text
                x={xCenter}
                y={CY - 4}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isActive ? COLORS.active : "rgba(244,244,245,0.97)"}
                fontSize="22"
                fontFamily="ui-monospace, monospace"
                fontWeight="700"
                style={{ transition: "fill 0.25s" }}
              >
                {fmtInt(flow.center.value)}
              </text>
              <text
                x={xCenter}
                y={CY + cardH / 2 - 8}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(113,113,122,0.7)"
                fontSize="9"
                fontFamily="ui-monospace, monospace"
              >
                {fmtBRLDecimal((data.mrr ?? 0) / 100)} MRR
              </text>
              <line
                x1={xCenter - cardW / 2 + 12}
                y1={CY + 10}
                x2={xCenter + cardW / 2 - 12}
                y2={CY + 10}
                stroke="rgba(99,102,241,0.18)"
                strokeWidth="1"
              />
            </g>
          );
        })()}

        {links.map((link) => {
          const h1 = logH(link.value, maxLog);
          const h2 = Math.max(h1 * 0.8, FLOW_H * 0.05);
          const d = flowPath(link.x1, h1, link.x2, h2, link.cy1, link.cy2);
          return (
            <path
              key={`hit-${link.key}`}
              d={d}
              fill="transparent"
              onMouseEnter={() => setHovered(link.key)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            />
          );
        })}

        {allNodes.filter((n) => n.side !== "center").map((node) => {
          const pillW = 60;
          const pillH = 28;
          const px = node.side === "left"
            ? Math.max(0, node.cx - pillW - 12)
            : Math.min(W - pillW, node.cx + 12);
          return (
            <rect
              key={`hit-node-${node.key}`}
              x={px}
              y={node.cy - pillH / 2 - 14}
              width={pillW}
              height={pillH + 28}
              fill="transparent"
              onMouseEnter={() => setHovered(node.key)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            />
          );
        })}

        <rect
          x={xCenter - 48}
          y={CY - 26 - 20}
          width={96}
          height={52 + 20}
          fill="transparent"
          onMouseEnter={() => setHovered("active")}
          onMouseLeave={() => setHovered(null)}
          className="cursor-pointer"
        />
      </svg>
    </div>
  );
}

export function SubscriberFlowSankey({ data, isLoading }: SubscriberFlowSankeyProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">Fluxo de Assinantes</h3>
      <p className="mt-0.5 text-xs text-zinc-500 mb-2">
        Entradas (Novos, Expansão) → Base Ativa → Saídas (Churn, Inadimplência)
      </p>
      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-lg bg-zinc-800" />
      ) : !data ? (
        <div className="flex items-center justify-center h-56 text-zinc-600 text-sm">
          Sem dados de recorrência
        </div>
      ) : (
        <SubscriberSankeyInner data={data} />
      )}
    </div>
  );
}
