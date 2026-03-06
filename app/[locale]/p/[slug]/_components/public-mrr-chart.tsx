"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import dayjs from "dayjs";
import type { IPublicMrrEntry } from "@/interfaces/public-page.interface";

interface PublicMrrChartProps {
  data: IPublicMrrEntry[];
  currency: string;
  locale: string;
}

function formatMonth(dateStr: string): string {
  return dayjs(dateStr).format("MMM/YY");
}

function formatExact(value: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function formatCompact(value: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value / 100);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  locale: string;
  currency: string;
}

function CustomTooltip({ active, payload, label, locale, currency }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/95 backdrop-blur-sm px-3 py-2 shadow-xl">
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">
        {label ? formatMonth(label) : ""}
      </p>
      <p className="text-sm font-bold text-indigo-400 font-mono tabular-nums">
        {formatExact(payload[0].value, locale, currency)}
      </p>
    </div>
  );
}

export function PublicMrrChart({ data, currency, locale }: PublicMrrChartProps) {
  if (!data.length) return null;

  const formatted = data.map((d) => ({
    ...d,
    label: formatMonth(d.date),
  }));

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-tight sm:tracking-widest text-zinc-500 mb-3 sm:mb-4">
        Evolução do MRR
      </p>

      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="public-mrr-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="80%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(63,63,70,0.15)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#52525b", fontFamily: "ui-monospace, monospace" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => formatCompact(v, locale, currency)}
            tick={{ fontSize: 10, fill: "#52525b", fontFamily: "ui-monospace, monospace" }}
            axisLine={false}
            tickLine={false}
            width={58}
          />
          <Tooltip
            content={<CustomTooltip locale={locale} currency={currency} />}
            cursor={{ stroke: "#3f3f46", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="mrr"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#public-mrr-grad)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "#6366f1",
              stroke: "#1e1b4b",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
