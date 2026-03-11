"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useBilling } from "@/hooks/queries/use-billing";
import { BillingCurrentPlan } from "./_components/billing-current-plan";
import { BillingPlansGrid } from "./_components/billing-plans-grid";
import { growareTrack } from "@/utils/groware";
import type { PlanSlug } from "@/utils/plans";

type Currency = "brl" | "usd";
type BillingInterval = "monthly" | "annual";

export default function BillingPage() {
  const t = useTranslations("settings.billing.page");
  const { data: session } = useSession();
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
        toast.error(data.error ?? t("errorOpenPortal"));
      }
    } catch {
      toast.error(t("errorOpenPortal"));
    } finally {
      setIsLoadingPortal(false);
    }
  }

  async function handleSelectPlan(slug: PlanSlug) {
    setIsLoadingCheckout(true);
    growareTrack("gateway", {
      product_id: slug,
      customer_id: session?.user?.id,
    });
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug: slug, currency }),
      });
      const data = await res.json();
      if (data.url) {
        growareTrack("checkout_started", {
          gross_value: undefined,
          currency: currency.toUpperCase(),
          product_id: slug,
          customer_id: session?.user?.id,
        });
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? t("errorCheckout"));
      }
    } catch {
      toast.error(t("errorProcessCheckout"));
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
        {t("noDataMessage")}
      </p>
    );
  }

  return (
    <div className="max-w-[1100px] space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-[11px] text-zinc-500 uppercase tracking-[0.12em] mb-1">{t("settingsLabel")}</p>
          <h1 className="text-[22px] font-semibold text-zinc-100">{t("pageTitle")}</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex bg-[#111118] border border-[#1e1e2e] rounded-lg p-[3px] gap-0.5">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-3 py-[5px] rounded-md text-xs font-medium transition-all relative ${
                billingInterval === "monthly" ? "bg-[#1e1e30] text-zinc-200" : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              {t("monthly")}
            </button>
            <button
              onClick={() => setBillingInterval("annual")}
              className={`px-3 py-[5px] rounded-md text-xs font-medium transition-all relative ${
                billingInterval === "annual" ? "bg-[#1e1e30] text-zinc-200" : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              {t("annual")}
              <span className="absolute -top-2 -right-0.5 bg-emerald-600 text-white text-[9px] font-bold px-1 py-px rounded">
                {t("annualDiscount")}
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
        {t("footerText")}
      </p>
    </div>
  );
}
