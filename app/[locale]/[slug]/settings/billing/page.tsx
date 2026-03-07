"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useBilling } from "@/hooks/queries/use-billing";
import { BillingCurrentPlan } from "./_components/billing-current-plan";
import { BillingPlansGrid } from "./_components/billing-plans-grid";
import type { PlanSlug } from "@/utils/plans";

type Currency = "brl" | "usd";
type BillingInterval = "monthly" | "annual";

export default function BillingPage() {
  const { data: billing, isLoading } = useBilling();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [currency, setCurrency] = useState<Currency>("brl");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");

  async function handleManagePortal() {
    setIsLoadingPortal(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? "Erro ao abrir portal de faturamento");
      }
    } catch {
      toast.error("Erro ao abrir portal de faturamento");
    } finally {
      setIsLoadingPortal(false);
    }
  }

  async function handleSelectPlan(slug: PlanSlug) {
    setIsLoadingCheckout(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug: slug, currency }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? "Erro ao criar sessão de checkout");
      }
    } catch {
      toast.error("Erro ao processar checkout");
    } finally {
      setIsLoadingCheckout(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-[1100px]">
        <Skeleton className="h-56 w-full rounded-xl bg-zinc-800/50" />
        <Skeleton className="h-80 w-full rounded-xl bg-zinc-800/50" />
      </div>
    );
  }

  if (!billing) {
    return (
      <p className="text-center py-8 text-zinc-600 text-sm">
        Não foi possível carregar as informações do plano.
      </p>
    );
  }

  return (
    <div className="max-w-[1100px] space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] text-zinc-500 uppercase tracking-[0.12em] mb-1">Configurações</p>
          <h1 className="text-[22px] font-semibold text-zinc-100">Plano & Uso</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex bg-[#111118] border border-[#1e1e2e] rounded-lg p-[3px] gap-0.5">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-3 py-[5px] rounded-md text-xs font-medium transition-all relative ${
                billingInterval === "monthly" ? "bg-[#1e1e30] text-zinc-200" : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingInterval("annual")}
              className={`px-3 py-[5px] rounded-md text-xs font-medium transition-all relative ${
                billingInterval === "annual" ? "bg-[#1e1e30] text-zinc-200" : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              Anual
              <span className="absolute -top-2 -right-0.5 bg-emerald-600 text-white text-[9px] font-bold px-1 py-px rounded">
                -20%
              </span>
            </button>
          </div>

          <div className="flex bg-[#111118] border border-[#1e1e2e] rounded-lg p-[3px] gap-0.5">
            {(["brl", "usd"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-[5px] rounded-md text-xs font-semibold transition-all ${
                  currency === c ? "bg-[#1e1e30] text-zinc-200" : "text-zinc-500 hover:text-zinc-400"
                }`}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <BillingCurrentPlan
        billing={billing}
        currency={currency}
        onManage={handleManagePortal}
        isLoadingPortal={isLoadingPortal}
      />

      <BillingPlansGrid
        currentPlanSlug={billing.plan.slug}
        currency={currency}
        billingInterval={billingInterval}
        onSelectPlan={handleSelectPlan}
        isLoading={isLoadingCheckout}
      />

      <p className="text-xs text-zinc-700 text-center">
        Todos os planos incluem Stripe e MRR/Recorrência · Cancele quando quiser · Sem fidelidade
      </p>
    </div>
  );
}
