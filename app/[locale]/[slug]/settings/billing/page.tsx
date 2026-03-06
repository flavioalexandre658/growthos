"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useBilling } from "@/hooks/queries/use-billing";
import { BillingPlanCard } from "./_components/billing-plan-card";
import { BillingUsageMeter } from "./_components/billing-usage-meter";
import { BillingPlansGrid } from "./_components/billing-plans-grid";
import type { PlanSlug } from "@/utils/plans";

export default function BillingPage() {
  const { data: billing, isLoading } = useBilling();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

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

  async function handleSelectPlan(slug: PlanSlug, currency: "brl" | "usd") {
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
      <div className="space-y-4">
        <Skeleton className="h-44 w-full rounded-xl bg-zinc-800" />
        <Skeleton className="h-36 w-full rounded-xl bg-zinc-800" />
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
    <div className="space-y-5">
      <div>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-3">
          Plano & Uso
        </p>
        <div className="space-y-3">
          <BillingPlanCard
            billing={billing}
            onUpgrade={() => setShowPlans(true)}
            onManage={handleManagePortal}
            isLoadingPortal={isLoadingPortal}
          />

          <BillingUsageMeter billing={billing} />

          {showPlans && (
            <BillingPlansGrid
              currentPlanSlug={billing.plan.slug}
              onSelectPlan={handleSelectPlan}
              isLoading={isLoadingCheckout}
            />
          )}
        </div>
      </div>
    </div>
  );
}
