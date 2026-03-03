"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal, fmtInt } from "@/utils/format";
import { IconPackage, IconArrowRight } from "@tabler/icons-react";
import type { ITopProduct } from "@/interfaces/dashboard.interface";

interface TopProductsProps {
  data: ITopProduct[] | undefined;
  isLoading: boolean;
}

export function TopProducts({ data, isLoading }: TopProductsProps) {
  const { slug } = useParams<{ slug: string }>();
  const products = data ?? [];
  const maxRevenue = products[0]?.revenueInCents ?? 1;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/15">
            <IconPackage size={14} className="text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Top Produtos</h3>
            <p className="text-[11px] text-zinc-500">Por receita no período</p>
          </div>
        </div>
        <Link
          href={`/${slug}/events?event_types=payment`}
          className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Ver todos
          <IconArrowRight size={11} />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-32 bg-zinc-800" />
                <Skeleton className="h-3 w-16 bg-zinc-800" />
              </div>
              <Skeleton className="h-1.5 w-full bg-zinc-800 rounded-full" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-6">
          <p className="text-xs text-zinc-700">Nenhum pagamento no período</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p, i) => {
            const barWidth = Math.max((p.revenueInCents / maxRevenue) * 100, 2);
            return (
              <div key={`${p.productName}-${i}`} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-600 w-4 shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="text-xs text-zinc-300 flex-1 truncate">
                    {p.productName}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 tabular-nums shrink-0">
                    {fmtBRLDecimal(p.revenueInCents / 100)}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600 tabular-nums shrink-0 w-8 text-right">
                    {fmtInt(p.payments)}×
                  </span>
                </div>
                <div className="ml-6 h-1 rounded-full bg-zinc-800/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500/60 transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
