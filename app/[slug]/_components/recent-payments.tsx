"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRLDecimal } from "@/utils/format";
import { IconArrowRight } from "@tabler/icons-react";
import dayjs from "@/utils/dayjs";
import type { IRecentPayment } from "@/interfaces/dashboard.interface";

interface RecentPaymentsProps {
  payments: IRecentPayment[];
  isLoading: boolean;
}

export function RecentPayments({ payments, isLoading }: RecentPaymentsProps) {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Últimos Pagamentos</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Transações recentes</p>
        </div>
        <Link
          href={`/${slug}/events?event_types=payment`}
          className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-indigo-400 transition-colors"
        >
          Ver todos
          <IconArrowRight size={11} />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full bg-zinc-800 rounded-lg" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <p className="text-xs text-zinc-700 py-4 text-center">
          Nenhum pagamento encontrado
        </p>
      ) : (
        <div className="space-y-1">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-zinc-800/40 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs text-zinc-300 truncate max-w-[200px]">
                  {p.productName ?? "—"}
                </span>
                {p.source && (
                  <span className="text-[10px] text-zinc-600 shrink-0 hidden sm:inline font-mono">
                    {p.source}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono font-semibold text-emerald-400">
                  {fmtBRLDecimal(p.grossValueInCents / 100)}
                </span>
                <span className="text-[10px] text-zinc-700 hidden sm:inline">
                  {dayjs(p.createdAt).fromNow()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
