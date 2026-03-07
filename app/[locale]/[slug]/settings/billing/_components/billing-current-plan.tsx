"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IBillingData } from "@/actions/billing/get-billing.action";
import { formatRevenueLimit } from "@/utils/plans";

interface BillingCurrentPlanProps {
  billing: IBillingData;
  currency: "brl" | "usd";
  onManage: () => void;
  isLoadingPortal: boolean;
}

function SparkleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
      <path
        d="M6 1l1.2 3.8L11 6l-3.8 1.2L6 11l-1.2-3.8L1 6l3.8-1.2L6 1z"
        fill="#fbbf24"
      />
    </svg>
  );
}

function formatCents(cents: number): string {
  const val = cents / 100;
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(1)}k`;
  return `R$ ${val.toFixed(0)}`;
}

const ORG_COLORS = ["#818cf8", "#a78bfa", "#34d399", "#f59e0b", "#ef4444", "#ec4899"];

export function BillingCurrentPlan({
  billing,
  currency,
  onManage,
  isLoadingPortal,
}: BillingCurrentPlanProps) {
  const t = useTranslations("settings.billing.currentPlan");
  const { plan, revenue, ownedOrgsCount, totalMembersInOrg } = billing;
  const isFree = plan.slug === "free";

  const revPct = plan.maxRevenuePerMonthBrl === Infinity
    ? 0
    : Math.min((revenue.totalInCents / plan.maxRevenuePerMonthBrl) * 100, 100);

  const isOverOrgLimit = plan.maxOrgs !== Infinity && ownedOrgsCount > plan.maxOrgs;
  const isOverMemberLimit = plan.maxMembers !== Infinity && totalMembersInOrg > plan.maxMembers;
  const orgsPct = plan.maxOrgs === Infinity ? 0 : Math.min((ownedOrgsCount / plan.maxOrgs) * 100, 100);

  const planColor = plan.color;

  const priceLabel = isFree
    ? currency === "brl" ? t("freeForeverBrl") : t("freeForeverUsd")
    : currency === "brl"
      ? `R$ ${(plan.priceBrlCents / 100).toFixed(0)}/mês`
      : `$${(plan.priceUsdCents / 100).toFixed(0)}/mo`;

  return (
    <div className="relative bg-[#0f0f1a] border border-[#1a1a2e] rounded-[14px] p-6 overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${planColor}40, transparent)` }}
      />

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: planColor, boxShadow: `0 0 8px ${planColor}60` }}
            />
            <span className="text-[11px] text-zinc-500 uppercase tracking-[0.1em]">{t("label")}</span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">{plan.name}</h2>
          <p className="text-[13px] text-zinc-600 mt-0.5">{priceLabel}</p>
        </div>

        <div className="flex gap-2">
          {!isFree && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200"
              onClick={onManage}
              disabled={isLoadingPortal}
            >
              {isLoadingPortal ? t("openingPortal") : t("manageSubscription")}
            </Button>
          )}
          <button
            className="px-5 py-2.5 rounded-lg text-white text-[13px] font-semibold cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)", boxShadow: "0 0 20px #7c3aed30" }}
            onClick={() => document.getElementById("plans-grid")?.scrollIntoView({ behavior: "smooth" })}
          >
            {t("upgrade")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-[10px] p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] text-zinc-500 uppercase tracking-[0.1em]">{t("revenueThisMonth")}</span>
            {plan.maxRevenuePerMonthBrl !== Infinity && (
              <span className={cn("text-[11px]", revPct > 80 ? "text-red-500" : "text-zinc-500")}>
                {revPct.toFixed(0)}%
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-[28px] font-bold text-zinc-100 tracking-tight">
              {formatCents(revenue.totalInCents)}
            </span>
            {plan.maxRevenuePerMonthBrl !== Infinity && (
              <span className="text-[13px] text-zinc-600">
                / {formatRevenueLimit(plan.maxRevenuePerMonthBrl)}
              </span>
            )}
          </div>
          <div className="h-1 bg-[#1a1a2e] rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm transition-all duration-500"
              style={{
                width: `${Math.max(revPct, 0.5)}%`,
                background: revPct > 80 ? "#ef4444" : revPct > 60 ? "#f59e0b" : "#a78bfa",
              }}
            />
          </div>

          {revenue.byOrg.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {revenue.byOrg
                .sort((a, b) => b.revenueInCents - a.revenueInCents)
                .map((org, i) => {
                  const orgColor = ORG_COLORS[i % ORG_COLORS.length];
                  const orgPct = revenue.totalInCents > 0
                    ? (org.revenueInCents / revenue.totalInCents) * 100
                    : 0;
                  return (
                    <div key={org.organizationId} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ background: orgColor }} />
                      <span className="text-xs text-zinc-400 flex-1 truncate">{org.organizationName}</span>
                      <span className="text-xs text-zinc-500">{formatCents(org.revenueInCents)}</span>
                      <div className="w-[60px] h-[3px] bg-[#1a1a2e] rounded-sm">
                        <div className="h-full rounded-sm" style={{ width: `${orgPct}%`, background: orgColor }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className={cn("bg-[#0a0a14] border rounded-[10px] p-4", isOverOrgLimit ? "border-red-900/60" : "border-[#1a1a2e]")}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] text-zinc-500 uppercase tracking-[0.1em]">{t("organizations")}</span>
            {isOverOrgLimit && (
              <span className="text-[10px] bg-red-900/80 text-red-300 px-1.5 py-0.5 rounded font-semibold">{t("limit")}</span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className={cn("text-[28px] font-bold tracking-tight", isOverOrgLimit ? "text-red-500" : "text-zinc-100")}>
              {ownedOrgsCount}
            </span>
            <span className="text-[13px] text-zinc-600">/ {plan.maxOrgs === Infinity ? "∞" : plan.maxOrgs}</span>
          </div>
          <div className="h-1 bg-[#1a1a2e] rounded-sm overflow-hidden mb-3">
            <div
              className="h-full rounded-sm transition-all"
              style={{ width: `${plan.maxOrgs === Infinity ? 0 : orgsPct}%`, background: isOverOrgLimit ? "#ef4444" : "#a78bfa" }}
            />
          </div>
          {isOverOrgLimit && (
            <div className="bg-red-900/10 border border-red-900/30 rounded-md px-2.5 py-2 text-xs text-red-300">
              {t("orgLimitReached")}
            </div>
          )}
        </div>

        <div className={cn("bg-[#0a0a14] border rounded-[10px] p-4", isOverMemberLimit ? "border-red-900/60" : "border-[#1a1a2e]")}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] text-zinc-500 uppercase tracking-[0.1em]">{t("members")}</span>
            {isOverMemberLimit && (
              <span className="text-[10px] bg-red-900/80 text-red-300 px-1.5 py-0.5 rounded font-semibold">{t("limit")}</span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className={cn("text-[28px] font-bold tracking-tight", isOverMemberLimit ? "text-red-500" : "text-zinc-100")}>
              {totalMembersInOrg}
            </span>
            <span className="text-[13px] text-zinc-600">/ {plan.maxMembers === Infinity ? "∞" : plan.maxMembers}</span>
          </div>
          <div className="h-1 bg-[#1a1a2e] rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm transition-all"
              style={{
                width: `${plan.maxMembers === Infinity ? 0 : Math.min((totalMembersInOrg / plan.maxMembers) * 100, 100)}%`,
                background: isOverMemberLimit ? "#ef4444" : "#a78bfa",
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 px-3.5 py-2.5 bg-[#0d1117] border border-[#1a2035] rounded-lg flex items-center gap-2">
        <SparkleIcon />
        <span className="text-xs text-zinc-500">
          {t("planIncludes", { planName: plan.name })}
        </span>
      </div>
    </div>
  );
}
