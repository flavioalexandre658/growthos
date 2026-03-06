"use client";

import { useState } from "react";
import { IconCheck, IconSparkles } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLANS_LIST, formatEventsLimit } from "@/utils/plans";
import type { PlanSlug } from "@/utils/plans";

interface BillingPlansGridProps {
  currentPlanSlug: PlanSlug;
  onSelectPlan: (slug: PlanSlug, currency: "brl" | "usd") => void;
  isLoading: boolean;
}

export function BillingPlansGrid({ currentPlanSlug, onSelectPlan, isLoading }: BillingPlansGridProps) {
  const [currency, setCurrency] = useState<"brl" | "usd">("brl");

  const paidPlans = PLANS_LIST.filter((p) => p.slug !== "free");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Planos disponíveis</p>
        <div className="flex items-center rounded-lg border border-zinc-800 overflow-hidden">
          <button
            onClick={() => setCurrency("brl")}
            className={cn(
              "px-3 py-1 text-xs font-medium transition-colors",
              currency === "brl" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            BRL
          </button>
          <button
            onClick={() => setCurrency("usd")}
            className={cn(
              "px-3 py-1 text-xs font-medium transition-colors",
              currency === "usd" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            USD
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {paidPlans.map((plan) => {
          const isCurrent = plan.slug === currentPlanSlug;
          const price = currency === "brl" ? plan.priceBrlCents : plan.priceUsdCents;
          const symbol = currency === "brl" ? "R$" : "$";
          const isPopular = plan.slug === "pro";

          return (
            <div
              key={plan.slug}
              className={cn(
                "relative rounded-xl border p-4 space-y-3 transition-all",
                isCurrent
                  ? "border-indigo-500/40 bg-indigo-500/5"
                  : isPopular
                    ? "border-zinc-700 bg-zinc-800/60"
                    : "border-zinc-800 bg-zinc-800/30",
              )}
            >
              {isPopular && !isCurrent && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 bg-indigo-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    <IconSparkles size={9} /> Popular
                  </span>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-zinc-100">{plan.name}</p>
                <p className="text-xl font-bold text-zinc-100 mt-1">
                  {symbol} {(price / 100).toFixed(2).replace(".", ",")}
                  <span className="text-xs font-normal text-zinc-500">/mês</span>
                </p>
              </div>

              <ul className="space-y-1.5">
                <li className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <IconCheck size={11} className="text-indigo-400 shrink-0" />
                  {plan.maxOrgs === Infinity ? "Orgs ilimitadas" : `${plan.maxOrgs} org${plan.maxOrgs > 1 ? "s" : ""}`}
                </li>
                <li className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <IconCheck size={11} className="text-indigo-400 shrink-0" />
                  {formatEventsLimit(plan.maxEventsPerMonth)} eventos/mês
                </li>
                {plan.features.slice(2, 4).map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <IconCheck size={11} className="text-indigo-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                size="sm"
                className={cn(
                  "w-full text-xs",
                  isCurrent
                    ? "bg-zinc-700 text-zinc-400 cursor-default"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white",
                )}
                disabled={isCurrent || isLoading}
                onClick={() => !isCurrent && onSelectPlan(plan.slug as PlanSlug, currency)}
              >
                {isCurrent ? "Plano atual" : "Selecionar"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
