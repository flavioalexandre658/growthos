"use client";

import { IFunnelData } from "@/interfaces/dashboard.interface";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtInt } from "@/utils/format";

interface FunnelSectionProps {
  data: IFunnelData | null | undefined;
  isLoading: boolean;
}

const steps = [
  { key: "signups" as const, label: "Cadastros", color: "#6366f1", bg: "bg-indigo-600/20", text: "text-indigo-400" },
  { key: "edits" as const, label: "Edições", color: "#8b5cf6", bg: "bg-violet-600/20", text: "text-violet-400" },
  { key: "payments" as const, label: "Pagamentos", color: "#22c55e", bg: "bg-emerald-600/20", text: "text-emerald-400" },
];

const rates = [
  { label: "Cadastro → Edição", key: "signup_to_edit" as const, color: "text-violet-400", border: "border-violet-600/30", bg: "bg-violet-600/10" },
  { label: "Edição → Pagamento", key: "edit_to_payment" as const, color: "text-emerald-400", border: "border-emerald-600/30", bg: "bg-emerald-600/10" },
  { label: "Conversão Total", key: "signup_to_payment" as const, color: "text-amber-400", border: "border-amber-600/30", bg: "bg-amber-600/10" },
];

export function FunnelSection({ data, isLoading }: FunnelSectionProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-bold text-zinc-100">Funil de Conversão</h3>
      <p className="mt-0.5 text-xs text-zinc-500">Cadastro → Edição → Pagamento</p>

      {isLoading ? (
        <div className="mt-5 space-y-4">
          <div className="flex gap-3">
            {[100, 70, 40].map((w, i) => (
              <div key={i} className="flex-1 text-center">
                <Skeleton className="h-10 rounded-lg bg-zinc-800" />
                <Skeleton className="mx-auto mt-2 h-3 w-16 bg-zinc-800" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-36 rounded-lg bg-zinc-800" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 flex gap-3">
            {steps.map((step) => {
              const total = data?.signups ?? 1;
              const value = data?.[step.key] ?? 0;
              const pct = Math.max((value / total) * 100, 4);
              return (
                <div key={step.key} className="flex-1 text-center">
                  <div
                    className="relative flex h-10 items-center justify-center overflow-hidden rounded-lg"
                    style={{ background: `${step.color}18` }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 rounded-lg transition-all duration-500"
                      style={{ width: `${pct}%`, background: `${step.color}35` }}
                    />
                    <span
                      className={`relative text-base font-bold font-mono ${step.text}`}
                    >
                      {fmtInt(value)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-500">{step.label}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {rates.map((rate) => (
              <div
                key={rate.key}
                className={`rounded-lg border ${rate.border} ${rate.bg} px-4 py-2.5 text-center`}
              >
                <p className={`text-lg font-bold font-mono ${rate.color}`}>
                  {data?.rates?.[rate.key] ?? 0}%
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-500">{rate.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
