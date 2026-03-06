"use client";

import { useMemo } from "react";
import type { IPublicSankey } from "@/interfaces/public-page.interface";

interface PublicSankeyProps {
  data: IPublicSankey;
  currency: string;
  locale: string;
}

const W = 900;
const H = 340;
const FLOW_TOP = 40;
const FLOW_BOT = H - 40;
const FLOW_H = FLOW_BOT - FLOW_TOP;
const CY = FLOW_TOP + FLOW_H / 2;
const BAND_GAP = 10;
const CARD_W = 120;
const CARD_H = 68;

const BANDS = [
  { scale: 1.0, opacity: 0.06 },
  { scale: 0.72, opacity: 0.12 },
  { scale: 0.48, opacity: 0.22 },
  { scale: 0.28, opacity: 0.35 },
];

const COLORS = {
  new: "#22c55e",
  renewal: "#3b82f6",
  active: "#6366f1",
  canceled: "#ef4444",
  pastdue: "#f97316",
};

const NODE_DESCRIPTIONS: Record<string, string> = {
  new: "entraram no período",
  renewal: "renovaram no período",
  canceled: "cancelaram",
  pastdue: "pagamento falhou",
};

function logH(value: number, maxLog: number): number {
  const MIN = FLOW_H * 0.07;
  const MAX = FLOW_H * 0.38;
  if (value <= 0 || maxLog <= 0) return MIN;
  return MIN + (Math.log2(value + 1) / maxLog) * (MAX - MIN);
}

function computeStack(values: number[], maxLog: number): { cy: number; h: number }[] {
  const heights = values.map((v) => logH(v, maxLog));
  const n = heights.length;
  const totalH = heights.reduce((a, b) => a + b, 0) + BAND_GAP * Math.max(n - 1, 0);
  let y = CY - totalH / 2;
  return heights.map((h) => {
    const cy = y + h / 2;
    y += h + BAND_GAP;
    return { cy, h };
  });
}

function computeSidePositions(count: number): number[] {
  if (count === 0) return [];
  if (count === 1) return [CY];
  const span = FLOW_H * 0.58;
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, i) => CY - span / 2 + i * step);
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

function fmtExact(value: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function fmtInt(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function MobileView({ data, locale, currency }: { data: IPublicSankey; locale: string; currency: string }) {
  const inputs = [
    { key: "new", label: "Novas assinaturas", desc: NODE_DESCRIPTIONS.new, value: data.newSubscriptions, color: COLORS.new },
    { key: "renewal", label: "Renovações", desc: NODE_DESCRIPTIONS.renewal, value: data.renewalSubscriptions, color: COLORS.renewal },
  ];
  const outputs = [
    { key: "canceled", label: "Cancelamentos", desc: NODE_DESCRIPTIONS.canceled, value: data.churnedSubscriptions, color: COLORS.canceled },
    { key: "pastdue", label: "Inadimplentes", desc: NODE_DESCRIPTIONS.pastdue, value: data.pastDueSubscriptions, color: COLORS.pastdue },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {inputs.map((node) => (
          <div
            key={node.key}
            className="px-3 py-2.5 rounded-lg bg-zinc-800/30 border border-zinc-800/50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-500 font-medium leading-tight">{node.label}</span>
              <span
                className="text-base font-bold font-mono px-2 py-0.5 rounded-md shrink-0"
                style={{ color: node.color, backgroundColor: `${node.color}15` }}
              >
                {node.value}
              </span>
            </div>
            <p className="text-[9px] text-zinc-700 mt-0.5">{node.desc}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl px-4 py-4 text-center border"
        style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.15)" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Base Ativa</p>
        <p className="text-4xl font-bold font-mono text-zinc-100">{fmtInt(data.activeSubscriptions)}</p>
        <p className="text-sm font-mono text-zinc-500 mt-1">{fmtExact(data.mrr, locale, currency)} MRR</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {outputs.map((node) => (
          <div
            key={node.key}
            className="px-3 py-2.5 rounded-lg bg-zinc-800/30 border border-zinc-800/50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-500 font-medium leading-tight">{node.label}</span>
              <span
                className="text-base font-bold font-mono px-2 py-0.5 rounded-md shrink-0"
                style={{ color: node.color, backgroundColor: `${node.color}15` }}
              >
                {node.value}
              </span>
            </div>
            <p className="text-[9px] text-zinc-700 mt-0.5">{node.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SankeyInner({ data, locale, currency }: { data: IPublicSankey; locale: string; currency: string }) {
  const xLeft = 110;
  const xCenter = W / 2;
  const xRight = W - 110;

  const { links, allNodes } = useMemo(() => {
    const inputs = [
      { key: "new", label: "Novas", desc: NODE_DESCRIPTIONS.new, value: data.newSubscriptions, color: COLORS.new },
      { key: "renewal", label: "Renovações", desc: NODE_DESCRIPTIONS.renewal, value: data.renewalSubscriptions, color: COLORS.renewal },
    ];
    const outputs = [
      { key: "canceled", label: "Cancelamentos", desc: NODE_DESCRIPTIONS.canceled, value: data.churnedSubscriptions, color: COLORS.canceled },
      { key: "pastdue", label: "Inadimplentes", desc: NODE_DESCRIPTIONS.pastdue, value: data.pastDueSubscriptions, color: COLORS.pastdue },
    ];

    const allValues = [data.activeSubscriptions, ...inputs.map((n) => n.value), ...outputs.map((n) => n.value)];
    const ml = Math.log2(Math.max(...allValues, 1) + 1);

    const inputStack = computeStack(inputs.map((n) => n.value), ml);
    const outputStack = computeStack(outputs.map((n) => n.value), ml);
    const inputSideY = computeSidePositions(inputs.length);
    const outputSideY = computeSidePositions(outputs.length);

    const xCardLeft = xCenter - CARD_W / 2;
    const xCardRight = xCenter + CARD_W / 2;

    const computedLinks = [
      ...inputs.map((node, i) => ({
        key: node.key,
        label: node.label,
        value: node.value,
        color1: node.color,
        color2: COLORS.active,
        x1: xLeft,
        x2: xCardLeft,
        cy1: inputSideY[i],
        cy2: inputStack[i].cy,
        h: inputStack[i].h,
      })),
      ...outputs.map((node, i) => ({
        key: node.key,
        label: node.label,
        value: node.value,
        color1: COLORS.active,
        color2: node.color,
        x1: xCardRight,
        x2: xRight,
        cy1: outputStack[i].cy,
        cy2: outputSideY[i],
        h: outputStack[i].h,
      })),
    ];

    const nodes = [
      ...inputs.map((n, i) => ({ ...n, side: "left" as const, cx: xLeft, cy: inputSideY[i] })),
      { key: "active", label: "Base Ativa", desc: "", value: data.activeSubscriptions, color: COLORS.active, side: "center" as const, cx: xCenter, cy: CY },
      ...outputs.map((n, i) => ({ ...n, side: "right" as const, cx: xRight, cy: outputSideY[i] })),
    ];

    return { links: computedLinks, allNodes: nodes };
  }, [data, xLeft, xCenter, xRight]);

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="public-sf-glow" x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
          {links.map((link) => (
            <linearGradient
              key={`g-${link.key}`}
              id={`public-g-${link.key}`}
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
          const d = flowPath(link.x1, link.h, link.x2, link.h, link.cy1, link.cy2);
          return (
            <path
              key={`glow-${link.key}`}
              d={d}
              fill={`url(#public-g-${link.key})`}
              filter="url(#public-sf-glow)"
              opacity={0.2}
            />
          );
        })}

        {BANDS.map((band, bIdx) =>
          links.map((link) => {
            const h = link.h * band.scale;
            const d = flowPath(link.x1, h, link.x2, h, link.cy1, link.cy2);
            return (
              <path
                key={`b${bIdx}-${link.key}`}
                d={d}
                fill={`url(#public-g-${link.key})`}
                opacity={band.opacity}
              />
            );
          }),
        )}

        <line x1={xLeft} y1={FLOW_TOP - 4} x2={xLeft} y2={FLOW_BOT + 4} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1={xRight} y1={FLOW_TOP - 4} x2={xRight} y2={FLOW_BOT + 4} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

        {allNodes
          .filter((n) => n.side !== "center")
          .map((node) => {
            const val = fmtInt(node.value);
            const pillW = Math.max(val.length * 10 + 28, 60);
            const pillH = 34;

            const pillX =
              node.side === "left"
                ? Math.max(0, node.cx - pillW - 14)
                : Math.min(W - pillW, node.cx + 14);

            const textX = pillX + pillW / 2;
            const desc = NODE_DESCRIPTIONS[node.key] ?? "";

            return (
              <g key={`node-${node.key}`}>
                <text
                  x={textX}
                  y={node.cy - 26}
                  textAnchor="middle"
                  fill="rgba(161,161,170,0.8)"
                  fontSize="12"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fontWeight="600"
                >
                  {node.label}
                </text>
                <text
                  x={textX}
                  y={node.cy - 26 + 12}
                  textAnchor="middle"
                  fill="rgba(113,113,122,0.6)"
                  fontSize="8"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fontWeight="400"
                >
                  {desc}
                </text>
                <rect
                  x={pillX}
                  y={node.cy - pillH / 2 + 4}
                  width={pillW}
                  height={pillH}
                  rx={pillH / 2}
                  fill="rgba(24,24,27,0.88)"
                  stroke="rgba(63,63,70,0.30)"
                  strokeWidth={0.75}
                />
                <text
                  x={textX}
                  y={node.cy + 5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(244,244,245,0.9)"
                  fontSize="16"
                  fontFamily="ui-monospace, monospace"
                  fontWeight="700"
                >
                  {val}
                </text>
              </g>
            );
          })}

        {(() => (
          <g>
            <text
              x={xCenter}
              y={CY - CARD_H / 2 - 10}
              textAnchor="middle"
              fill="rgba(161,161,170,0.7)"
              fontSize="11"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontWeight="600"
              letterSpacing="0.05em"
            >
              BASE ATIVA
            </text>
            <text
              x={xCenter}
              y={CY - 6}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(244,244,245,0.97)"
              fontSize="30"
              fontFamily="ui-monospace, monospace"
              fontWeight="700"
            >
              {fmtInt(data.activeSubscriptions)}
            </text>
            <text
              x={xCenter}
              y={CY + CARD_H / 2 - 10}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(212,212,216,0.8)"
              fontSize="11"
              fontFamily="ui-monospace, monospace"
            >
              {fmtExact(data.mrr, locale, currency)} MRR
            </text>
          </g>
        ))()}
      </svg>
    </div>
  );
}

export function PublicSankey({ data, currency, locale }: PublicSankeyProps) {
  const hasData =
    data.activeSubscriptions > 0 ||
    data.newSubscriptions > 0 ||
    data.renewalSubscriptions > 0;

  if (!hasData) return null;

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-tight sm:tracking-widest text-zinc-500">
          Fluxo de Assinantes
        </p>
        <p className="text-[11px] text-zinc-600 mt-0.5">
          Como a base se movimenta este mês
        </p>
      </div>

      <div className="hidden sm:block">
        <SankeyInner data={data} locale={locale} currency={currency} />
      </div>

      <div className="sm:hidden px-4 pb-4">
        <MobileView data={data} locale={locale} currency={currency} />
      </div>
    </div>
  );
}
