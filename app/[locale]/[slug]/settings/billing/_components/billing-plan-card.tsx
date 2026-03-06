"use client";

import { IconCreditCard, IconCheck } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IBillingData } from "@/actions/billing/get-billing.action";
import { formatEventsLimit, PLANS_LIST } from "@/utils/plans";

interface BillingPlanCardProps {
  billing: IBillingData;
  onUpgrade: () => void;
  onManage: () => void;
  isLoadingPortal: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  past_due: "Pagamento pendente",
  canceled: "Cancelado",
  trialing: "Em trial",
};

export function BillingPlanCard({
  billing,
  onUpgrade,
  onManage,
  isLoadingPortal,
}: BillingPlanCardProps) {
  const { plan, subscriptionStatus, currentPeriodEnd } = billing;
  const isFree = plan.slug === "free";

  const statusLabel = subscriptionStatus ? STATUS_LABELS[subscriptionStatus] : null;
  const statusColor =
    subscriptionStatus === "active"
      ? "text-emerald-400"
      : subscriptionStatus === "past_due"
        ? "text-amber-400"
        : "text-zinc-500";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
            <IconCreditCard size={18} className="text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-zinc-100">{plan.name}</p>
              {!isFree && statusLabel && (
                <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
              )}
            </div>
            {isFree ? (
              <p className="text-xs text-zinc-500">Plano gratuito</p>
            ) : (
              <p className="text-xs text-zinc-500">
                R$ {(plan.priceBrlCents / 100).toFixed(2).replace(".", ",")}/mês
              </p>
            )}
          </div>
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
              {isLoadingPortal ? "Abrindo..." : "Gerenciar"}
            </Button>
          )}
          <Button
            size="sm"
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
            onClick={onUpgrade}
          >
            {isFree ? "Fazer upgrade" : "Mudar plano"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-lg bg-zinc-800/60 px-3 py-2.5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Organizações</p>
          <p className="text-sm font-semibold text-zinc-200">
            {plan.maxOrgs === Infinity ? "Ilimitadas" : `Até ${plan.maxOrgs}`}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-800/60 px-3 py-2.5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Eventos/mês</p>
          <p className="text-sm font-semibold text-zinc-200">{formatEventsLimit(plan.maxEventsPerMonth)}</p>
        </div>
      </div>

      {currentPeriodEnd && (
        <p className="text-xs text-zinc-600">
          Próxima renovação:{" "}
          {new Date(currentPeriodEnd).toLocaleDateString("pt-BR")}
        </p>
      )}

      <div className="border-t border-zinc-800 pt-3">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Recursos incluídos</p>
        <ul className="space-y-1">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
              <IconCheck size={12} className="text-indigo-400 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
