"use client";

import { useState, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { IconUsers } from "@tabler/icons-react";
import { fmtInt, fmtBRLDecimal } from "@/utils/format";
import type { ISourceDistribution } from "@/interfaces/dashboard.interface";

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#22c55e",
  "#f59e0b",
  "#06b6d4",
  "#71717a",
];

interface SourceChartProps {
  data: ISourceDistribution | null | undefined;
  isLoading: boolean;
}

function renderActiveShape(props: unknown) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props as {
      cx: number;
      cy: number;
      innerRadius: number;
      outerRadius: number;
      startAngle: number;
      endAngle: number;
      fill: string;
    };
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={(innerRadius as number) - 3}
        outerRadius={(outerRadius as number) + 5}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
      />
    </g>
  );
}

export function SourceChart({ data, isLoading }: SourceChartProps) {
  const sources = data?.sources ?? [];
  const total = data?.total ?? 0;
  const [activeIdx, setActiveIdx] = useState<number | undefined>(undefined);

  const onEnter = useCallback((_: unknown, index: number) => {
    setActiveIdx(index);
  }, []);
  const onLeave = useCallback(() => setActiveIdx(undefined), []);

  const hoveredSource = activeIdx !== undefined ? sources[activeIdx] : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/15">
          <IconUsers size={14} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Canais de Entrada</h3>
          <p className="text-[11px] text-zinc-500">Origem dos cadastros</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col sm:flex-row gap-6 flex-1">
          <Skeleton className="h-40 w-40 rounded-full bg-zinc-800 shrink-0 mx-auto" />
          <div className="space-y-2 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full bg-zinc-800 rounded-lg" />
            ))}
          </div>
        </div>
      ) : sources.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-zinc-700">Nenhum dado disponível</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-5 flex-1 items-stretch">
          <div className="relative shrink-0 mx-auto sm:mx-0 self-center" style={{ width: 160, height: 160 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={sources}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={2}
                  strokeWidth={0}
                  activeIndex={activeIdx}
                  activeShape={renderActiveShape}
                  onMouseEnter={onEnter}
                  onMouseLeave={onLeave}
                >
                  {sources.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      opacity={
                        activeIdx === undefined ? 0.85 : activeIdx === idx ? 1 : 0.25
                      }
                      className="transition-opacity duration-200"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {hoveredSource ? (
                <>
                  <span className="text-lg font-bold font-mono text-zinc-100 leading-tight">
                    {fmtInt(hoveredSource.count)}
                  </span>
                  <span className="text-[10px] text-zinc-400 capitalize truncate max-w-[80px] text-center">
                    {hoveredSource.source}
                  </span>
                  {hoveredSource.revenueInCents > 0 && (
                    <span className="text-[9px] text-emerald-500 font-mono mt-0.5">
                      {fmtBRLDecimal(hoveredSource.revenueInCents / 100)}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-lg font-bold font-mono text-zinc-100 leading-tight">
                    {fmtInt(total)}
                  </span>
                  <span className="text-[10px] text-zinc-600">total</span>
                </>
              )}
            </div>
          </div>

          <div className="w-full flex flex-col justify-between flex-1 gap-1">
            {sources.map((s, idx) => {
              const isActive = activeIdx === idx;
              const isDimmed = activeIdx !== undefined && activeIdx !== idx;
              return (
                <div
                  key={s.source}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 transition-all duration-150 cursor-pointer ${
                    isActive ? "bg-zinc-800/70" : "hover:bg-zinc-800/30"
                  }`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseLeave={() => setActiveIdx(undefined)}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      background: CHART_COLORS[idx % CHART_COLORS.length],
                      opacity: isDimmed ? 0.25 : 1,
                    }}
                  />
                  <span
                    className={`text-xs capitalize flex-1 truncate transition-colors duration-150 ${
                      isDimmed ? "text-zinc-600" : "text-zinc-300"
                    }`}
                  >
                    {s.source}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.revenueInCents > 0 && (
                      <span
                        className={`text-[10px] font-mono tabular-nums transition-colors duration-150 ${
                          isDimmed ? "text-zinc-700" : "text-emerald-500"
                        }`}
                      >
                        {fmtBRLDecimal(s.revenueInCents / 100)}
                      </span>
                    )}
                    <span
                      className={`text-xs font-mono tabular-nums transition-colors duration-150 ${
                        isDimmed ? "text-zinc-700" : "text-zinc-400"
                      }`}
                    >
                      {fmtInt(s.count)}
                    </span>
                    <span
                      className={`text-[10px] font-mono tabular-nums w-8 text-right transition-colors duration-150 ${
                        isDimmed ? "text-zinc-700" : "text-zinc-600"
                      }`}
                    >
                      {s.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
