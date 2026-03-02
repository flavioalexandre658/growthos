"use client";

import { Suspense, useMemo } from "react";
import { useFunnel } from "@/hooks/queries/use-funnel";
import { useFixedCosts } from "@/hooks/queries/use-fixed-costs";
import { useVariableCosts } from "@/hooks/queries/use-variable-costs";
import { useOrganization } from "@/components/providers/organization-provider";
import { IDateFilter } from "@/interfaces/dashboard.interface";
import { buildProfitAndLoss } from "@/utils/build-pl";
import { PeriodFilter } from "@/app/dashboard/_components/period-filter";
import { ProfitLossCards } from "./profit-loss-cards";
import { ProfitLossWaterfall } from "./profit-loss-waterfall";
import { FixedCostsTable } from "./fixed-costs-table";
import { VariableCostsTable } from "./variable-costs-table";
import { AiAnalysisSection } from "./ai-analysis-section";
import type { IFixedCost, IVariableCost } from "@/interfaces/cost.interface";

interface CostsContentProps {
  filter: IDateFilter;
}

export function CostsContent({ filter }: CostsContentProps) {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: funnel, isLoading: funnelLoading } = useFunnel(orgId, filter);
  const { data: fixedCosts, isLoading: fixedLoading } = useFixedCosts(orgId);
  const { data: variableCosts, isLoading: varLoading } = useVariableCosts(orgId);

  const grossRevenueInCents = useMemo(
    () => funnel?.revenue ?? 0,
    [funnel?.revenue]
  );

  const pl = useMemo(() => {
    if (!funnel || fixedLoading || varLoading) return null;
    return buildProfitAndLoss(
      grossRevenueInCents,
      (fixedCosts ?? []) as IFixedCost[],
      (variableCosts ?? []) as IVariableCost[]
    );
  }, [funnel, fixedCosts, variableCosts, grossRevenueInCents, fixedLoading, varLoading]);

  const isPlLoading = funnelLoading || fixedLoading || varLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Custos & P&L</h1>
          <p className="text-xs text-zinc-500">
            Discriminação de receita, custos, lucro bruto e lucro real
          </p>
        </div>
        <Suspense>
          <PeriodFilter filter={filter} />
        </Suspense>
      </div>

      <ProfitLossCards pl={pl} isLoading={isPlLoading} />

      <ProfitLossWaterfall pl={pl} isLoading={isPlLoading} />

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
