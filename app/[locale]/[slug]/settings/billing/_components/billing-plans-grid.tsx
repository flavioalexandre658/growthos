"use client";

import { PLANS_LIST, formatRevenueLimit } from "@/utils/plans";
import type { PlanSlug } from "@/utils/plans";
import { cn } from "@/lib/utils";
import { IconCheck, IconX, IconSparkles } from "@tabler/icons-react";

interface BillingPlansGridProps {
  currentPlanSlug: PlanSlug;
  currency: "brl" | "usd";
  billingInterval: "monthly" | "annual";
  onSelectPlan: (slug: PlanSlug) => void;
  isLoading: boolean;
}

export function BillingPlansGrid({
  currentPlanSlug,
  currency,
  billingInterval,
  onSelectPlan,
  isLoading,
}: BillingPlansGridProps) {
  const isBrl = currency === "brl";
  const isAnnual = billingInterval === "annual";

  return (
    <div id="plans-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {PLANS_LIST.map((plan) => {
        const isCurrent = plan.slug === currentPlanSlug;
        const isFree = plan.slug === "free";
        const basePrice = isBrl ? plan.priceBrlCents : plan.priceUsdCents;
        const price = isAnnual ? Math.round(basePrice * 0.8) : basePrice;
        const priceFormatted = isFree
          ? isBrl ? "R$ 0" : "$0"
          : isBrl
            ? `R$ ${(price / 100).toFixed(0)}`
            : `$${(price / 100).toFixed(0)}`;
        const revLimit = isBrl
          ? formatRevenueLimit(plan.maxRevenuePerMonthBrl)
          : formatRevenueLimit(plan.maxRevenuePerMonthUsd, "USD");
        const features = isBrl ? plan.featuresBrl : plan.featuresUsd;

        return (
          <div
            key={plan.slug}
            className={cn(
              "relative flex flex-col rounded-xl border p-5 transition-all",
              plan.popular
                ? "border-indigo-500/40 bg-indigo-600/5 ring-1 ring-indigo-500/20"
                : "border-zinc-800 bg-zinc-900/30",
            )}
          >
            {plan.popular && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                <IconSparkles size={10} />
                Popular
              </div>
            )}

            {isCurrent && (
              <div className="absolute -top-2.5 right-4 bg-zinc-700 text-zinc-200 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                Atual
              </div>
            )}

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: plan.color, boxShadow: `0 0 6px ${plan.color}40` }}
                />
                <h3 className="text-sm font-semibold text-zinc-100">{plan.name}</h3>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {isBrl ? plan.descriptionBrl : plan.descriptionUsd}
              </p>
            </div>

            <div className="mb-1">
              <span className="text-3xl font-bold text-zinc-100 tracking-tight">{priceFormatted}</span>
              {!isFree && (
                <span className="text-xs text-zinc-500 ml-1">/{isAnnual ? "mês (anual)" : "mês"}</span>
              )}
            </div>

            <p className="text-[11px] text-zinc-600 mb-5">
              {isFree ? "Para sempre" : `Até ${revLimit} receita/mês`}
            </p>

            <div className="flex-1 space-y-2 mb-5">
              {features.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5">
                  {f.included ? (
                    <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0", f.highlight ? "bg-indigo-600/20" : "bg-zinc-800")}>
                      <IconCheck size={10} className={f.highlight ? "text-indigo-400" : "text-zinc-500"} />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-zinc-900">
                      <IconX size={10} className="text-zinc-700" />
                    </div>
                  )}
                  <span className={cn("text-xs", f.included ? "text-zinc-300" : "text-zinc-600 line-through")}>{f.label}</span>
                </div>
              ))}
            </div>

            <button
              disabled={isCurrent || (isFree && isCurrent) || isLoading}
              onClick={() => onSelectPlan(plan.slug)}
              className={cn(
                "w-full py-2.5 rounded-lg text-xs font-semibold transition-all",
                isCurrent
                  ? "bg-zinc-800 text-zinc-500 cursor-default"
                  : plan.popular
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 cursor-pointer",
                isLoading && "opacity-50 cursor-wait",
              )}
            >
              {isCurrent ? "Plano atual" : isFree ? "Downgrade" : "Escolher plano"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
