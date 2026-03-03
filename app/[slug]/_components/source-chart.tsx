"use client";

import { useState, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { IconUsers } from "@tabler/icons-react";
import { fmtInt } from "@/utils/format";
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
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props as {
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
        innerRadius={(innerRadius as number) - 2}
        outerRadius={(outerRadius as number) + 4}
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

  const onLeave = useCallback(() => {
    setActiveIdx(undefined);
  }, []);

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
        <div className="flex flex-col items-center gap-3 flex-1 justify-center">
          <Skeleton className="h-32 w-32 rounded-full bg-zinc-800" />
          <div className="space-y-2 w-full">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full bg-zinc-800" />
            ))}
          </div>
        </div>
      ) : sources.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-zinc-700">Nenhum dado disponível</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 flex-1">
          <div className="relative w-full" style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={sources}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={70}
                  outerRadius={100}
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
                        activeIdx === undefined
                          ? 0.85
                          : activeIdx === idx
                            ? 1
                            : 0.3
                      }
                      className="transition-opacity duration-200"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pointer-events-none">
              {hoveredSource ? (
                <>
                  <span className="text-xl font-bold font-mono text-zinc-100">
                    {fmtInt(hoveredSource.count)}
                  </span>
                  <span className="text-[10px] text-zinc-400 capitalize truncate max-w-[100px]">
                    {hoveredSource.source}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xl font-bold font-mono text-zinc-100">
                    {fmtInt(total)}
                  </span>
                  <span className="text-[10px] text-zinc-600">total</span>
                </>
              )}
            </div>
          </div>

          <div className="w-full space-y-1.5">
            {sources.map((s, idx) => {
              const isActive = activeIdx === idx;
              const isDimmed = activeIdx !== undefined && activeIdx !== idx;
              return (
                <div
                  key={s.source}
                  className={`flex items-center gap-2 rounded-md px-2 py-1 transition-all duration-150 cursor-pointer ${
                    isActive ? "bg-zinc-800/60" : "hover:bg-zinc-800/30"
                  }`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onMouseLeave={() => setActiveIdx(undefined)}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0 transition-opacity duration-150"
                    style={{
                      background: CHART_COLORS[idx % CHART_COLORS.length],
                      opacity: isDimmed ? 0.3 : 1,
                    }}
                  />
                  <span
                    className={`text-xs truncate flex-1 capitalize transition-colors duration-150 ${
                      isDimmed ? "text-zinc-600" : "text-zinc-300"
                    }`}
                  >
                    {s.source}
                  </span>
                  <span
                    className={`text-xs font-mono shrink-0 tabular-nums transition-colors duration-150 ${
                      isDimmed ? "text-zinc-700" : "text-zinc-400"
                    }`}
                  >
                    {fmtInt(s.count)}
                  </span>
                  <span
                    className={`text-[10px] font-mono shrink-0 tabular-nums transition-colors duration-150 ${
                      isDimmed ? "text-zinc-700" : "text-zinc-600"
                    }`}
                  >
                    {s.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
