"use client";

import { Suspense, useMemo, useState } from "react";
import { useFunnel } from "@/hooks/queries/use-funnel";
import { useFixedCosts } from "@/hooks/queries/use-fixed-costs";
import { useVariableCosts } from "@/hooks/queries/use-variable-costs";
import { useRevenueSegments } from "@/hooks/queries/use-revenue-segments";
import { useOrganization } from "@/components/providers/organization-provider";
import { IDateFilter } from "@/interfaces/dashboard.interface";
import { buildProfitAndLoss } from "@/utils/build-pl";
import { resolvePeriodDays } from "@/utils/resolve-period-days";
import { PeriodFilter } from "@/app/[slug]/_components/period-filter";
import { ProfitLossCards } from "./profit-loss-cards";
import { ProfitLossWaterfall } from "./profit-loss-waterfall";
import { FixedCostsTable } from "./fixed-costs-table";
import { VariableCostsTable } from "./variable-costs-table";
import { AiAnalysisSection } from "./ai-analysis-section";
import { IconInfoCircle, IconChevronDown, IconChevronUp, IconAlertTriangle } from "@tabler/icons-react";
import type { IFixedCost, IVariableCost } from "@/interfaces/cost.interface";

interface CostsContentProps {
  filter: IDateFilter;
}

const PL_STEPS = [
  { label: "Receita Bruta", desc: "Total de pagamentos no período selecionado." },
  { label: "− Custos Variáveis", desc: "Percentuais sobre a receita (impostos, comissões, taxas de gateway). Podem ser segmentados por método de pagamento ou tipo de cobrança.", positive: false },
  { label: "= Lucro Operacional", desc: "Quanto sobra após descontar os custos que variam com as vendas.", highlight: true },
  { label: "− Custos Fixos", desc: "Valores mensais fixos (servidor, salários, ferramentas), rateados proporcionalmente ao período filtrado.", positive: false },
  { label: "= Lucro Líquido", desc: "O que sobrou de verdade após todos os custos.", highlight: true },
  { label: "Margem Líquida", desc: "Lucro Líquido ÷ Receita Bruta × 100. Mede a eficiência real do negócio." },
];

export function CostsContent({ filter }: CostsContentProps) {
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const [showExplanation, setShowExplanation] = useState(false);

  const periodDays = useMemo(() => resolvePeriodDays(filter), [filter]);
  const isSubMonth = periodDays < 30;

  const { data: funnel, isLoading: funnelLoading } = useFunnel(orgId, filter);
  const { data: fixedCosts, isLoading: fixedLoading } = useFixedCosts(orgId);
  const { data: variableCosts, isLoading: varLoading } = useVariableCosts(orgId);
  const { data: revenueSegments, isLoading: segmentsLoading } = useRevenueSegments(orgId, filter);

  const grossRevenueInCents = useMemo(
    () => funnel?.revenue ?? 0,
    [funnel?.revenue]
  );

  const pl = useMemo(() => {
    if (!funnel || fixedLoading || varLoading || segmentsLoading) return null;
    return buildProfitAndLoss(
      grossRevenueInCents,
      (fixedCosts ?? []) as IFixedCost[],
      (variableCosts ?? []) as IVariableCost[],
      periodDays,
      revenueSegments ?? undefined
    );
  }, [funnel, fixedCosts, variableCosts, grossRevenueInCents, fixedLoading, varLoading, segmentsLoading, periodDays, revenueSegments]);

  const isPlLoading = funnelLoading || fixedLoading || varLoading || segmentsLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Custos & P&L</h1>
          <p className="text-xs text-zinc-500">
            Receita, custos variáveis, lucro operacional, custos fixos e lucro líquido
          </p>
        </div>
        <Suspense>
          <PeriodFilter filter={filter} />
        </Suspense>
      </div>

      {isSubMonth && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <IconAlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300">
            Custos fixos estão sendo rateados proporcionalmente ao período selecionado ({periodDays} dia{periodDays !== 1 ? "s" : ""} de 30).
          </p>
        </div>
      )}

      <ProfitLossCards pl={pl} isLoading={isPlLoading} />

      <ProfitLossWaterfall pl={pl} isLoading={isPlLoading} />

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <button
          onClick={() => setShowExplanation((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <IconInfoCircle size={15} className="text-zinc-500" />
            <span className="text-sm font-medium text-zinc-300">Como funciona o P&L</span>
          </div>
          {showExplanation ? (
            <IconChevronUp size={14} className="text-zinc-500" />
          ) : (
            <IconChevronDown size={14} className="text-zinc-500" />
          )}
        </button>

        {showExplanation && (
          <div className="px-5 pb-5 space-y-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 pt-4">
              O P&L calcula o resultado financeiro real do negócio a partir dos eventos de pagamento coletados.
            </p>
            <div className="space-y-2">
              {PL_STEPS.map((step) => (
                <div
                  key={step.label}
                  className={`flex gap-3 rounded-lg px-3 py-2.5 ${step.highlight ? "bg-zinc-800/50 border border-zinc-700/50" : ""}`}
                >
                  <div className="min-w-[160px]">
                    <span className={`text-xs font-semibold font-mono ${step.positive === false ? "text-red-400" : step.highlight ? "text-indigo-300" : "text-zinc-300"}`}>
                      {step.label}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">{step.desc}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 px-3 py-2.5 space-y-1">
              <p className="text-xs font-semibold text-zinc-400">Sobre custos variáveis segmentados</p>
              <p className="text-xs text-zinc-500">
                Cada custo variável pode ser configurado para incidir apenas sobre a receita de um método de pagamento específico (ex: PIX, cartão) ou tipo de cobrança (avulso, recorrente). Isso evita que a taxa de gateway do Efibank, por exemplo, seja descontada da receita do Stripe.
              </p>
            </div>
          </div>
        )}
      </div>

      {orgId && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <FixedCostsTable organizationId={orgId} />
          <VariableCostsTable organizationId={orgId} />
        </div>
      )}

      {pl && funnel && (
        <AiAnalysisSection
          pl={pl}
          funnel={funnel}
          filter={filter}
          orgName={organization?.name ?? ""}
        />
      )}
    </div>
  );
}
