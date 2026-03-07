"use client";

import { useTranslations } from "next-intl";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, LabelList } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal } from "@/utils/format";
import type { IProfitAndLoss } from "@/interfaces/cost.interface";

interface WaterfallEntry {
  name: string;
  value: number;
  color: string;
  isNegative: boolean;
}

interface WaterfallNames {
  revenue: string;
  discounts: string;
  variableCosts: string;
  operatingProfit: string;
  fixedCosts: string;
  netProfit: string;
}

function buildData(pl: IProfitAndLoss, names: WaterfallNames): WaterfallEntry[] {
  const gross = pl.grossRevenueInCents / 100;
  const eventCosts = Math.abs(pl.eventCostsInCents / 100);
  const varTotal = Math.abs(pl.totalVariableCostsInCents / 100);
  const opProfit = pl.operatingProfitInCents / 100;
  const fixedTotal = Math.abs(pl.totalFixedCostsInCents / 100);
  const net = pl.netProfitInCents / 100;

  return [
    { name: names.revenue, value: gross, color: "#22c55e", isNegative: false },
    { name: names.discounts, value: -eventCosts, color: "#f43f5e", isNegative: true },
    { name: names.variableCosts, value: -varTotal, color: "#f97316", isNegative: true },
    { name: names.operatingProfit, value: opProfit, color: opProfit >= 0 ? "#06b6d4" : "#ef4444", isNegative: opProfit < 0 },
    { name: names.fixedCosts, value: -fixedTotal, color: "#ef4444", isNegative: true },
    { name: names.netProfit, value: net, color: net >= 0 ? "#6366f1" : "#ef4444", isNegative: net < 0 },
  ].filter((d) => d.value !== 0);
}

function fmtCompact(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${abs.toFixed(0)}`;
}

interface BarShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  payload: WaterfallEntry;
}

function CustomBarShape(props: unknown) {
  const { x, y, width, height, payload } = props as BarShapeProps;
  if (!width || height === undefined || height === 0) return null;

  const top = Math.min(y, y + height);
  const h = Math.abs(height);
  const w = width;
  const r = Math.min(4, h / 2);
  const isPositive = payload.value >= 0;

  let d: string;

  if (isPositive) {
    d = `
      M ${x},${top + h}
      L ${x},${top + r}
      Q ${x},${top} ${x + r},${top}
      L ${x + w - r},${top}
      Q ${x + w},${top} ${x + w},${top + r}
      L ${x + w},${top + h}
      Z
    `;
  } else {
    d = `
      M ${x},${top}
      L ${x + w},${top}
      L ${x + w},${top + h - r}
      Q ${x + w},${top + h} ${x + w - r},${top + h}
      L ${x + r},${top + h}
      Q ${x},${top + h} ${x},${top + h - r}
      Z
    `;
  }

  return <path d={d} fill={payload.color} fillOpacity={0.85} />;
}

function makeLabel(data: WaterfallEntry[]) {
  return function CustomLabel(props: unknown) {
    const { x, y, width, height, index } = props as {
      x: number;
      y: number;
      width: number;
      height: number;
      index: number;
    };
    const entry = data?.[index];
    if (!entry) return null;
    const absVal = Math.abs(entry.value);
    const prefix = entry.isNegative ? "− " : "";
    const top = Math.min(y, y + height);
    const barH = Math.abs(height);
    const labelY = entry.value >= 0 ? top - 12 : top + barH + 16;
    return (
      <text
        x={x + width / 2}
        y={labelY}
        textAnchor="middle"
        fill={entry.color}
        fontSize={10}
        fontFamily="monospace"
        fontWeight={700}
      >
        {prefix}{fmtBRLDecimal(absVal)}
      </text>
    );
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: WaterfallEntry }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const e = payload[0].payload;
  const absVal = Math.abs(e.value);
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1 font-medium">{e.name}</p>
      <p className="font-bold font-mono text-sm" style={{ color: e.color }}>
        {e.isNegative ? "− " : ""}{fmtBRLDecimal(absVal)}
      </p>
    </div>
  );
}

interface ProfitLossWaterfallProps {
  pl: IProfitAndLoss | null;
  isLoading: boolean;
}

export function ProfitLossWaterfall({ pl, isLoading }: ProfitLossWaterfallProps) {
  const t = useTranslations("finance.profitLossWaterfall");

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <Skeleton className="h-4 w-40 bg-zinc-800 mb-4" />
        <Skeleton className="h-64 w-full bg-zinc-800 rounded-lg" />
      </div>
    );
  }

  if (!pl) return null;

  const names: WaterfallNames = {
    revenue: t("revenue"),
    discounts: t("discounts"),
    variableCosts: t("variableCosts"),
    operatingProfit: t("operatingProfit"),
    fixedCosts: t("fixedCosts"),
    netProfit: t("netProfit"),
  };

  const data = buildData(pl, names);
  const CustomLabel = makeLabel(data);

  const allValues = data.map((d) => d.value);
  const maxVal = Math.max(...allValues, 0);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;
  const domainMin = minVal - range * 0.25;
  const domainMax = maxVal + range * 0.15;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100 mb-1">{t("title")}</h3>
      <p className="text-xs text-zinc-500 mb-5">
        {t("subtitle")}
      </p>

      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} barSize={44} margin={{ top: 32, right: 12, left: 4, bottom: 44 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717a", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            dy={12}
          />
          <YAxis
            domain={[domainMin, domainMax]}
            tick={{ fill: "#52525b", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtCompact}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <ReferenceLine y={0} stroke="#3f3f46" strokeWidth={1} />
          <Bar dataKey="value" shape={<CustomBarShape />} isAnimationActive={false}>
            <LabelList content={CustomLabel} dataKey="value" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
        {data.map((entry) => {
          const absVal = Math.abs(entry.value);
          return (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.color }} />
              <span className="text-[10px] text-zinc-500">{entry.name}</span>
              <span className="text-[10px] font-mono font-semibold" style={{ color: entry.color }}>
                {entry.isNegative ? "− " : ""}{fmtBRLDecimal(absVal)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
