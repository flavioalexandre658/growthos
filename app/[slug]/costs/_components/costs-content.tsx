"use client";

import { useMemo } from "react";
import { useFunnel } from "@/hooks/queries/use-funnel";
import { useFixedCosts } from "@/hooks/queries/use-fixed-costs";
import { useVariableCosts } from "@/hooks/queries/use-variable-costs";
import { useRevenueSegments } from "@/hooks/queries/use-revenue-segments";
import { useOrganization } from "@/components/providers/organization-provider";
import { buildProfitAndLoss } from "@/utils/build-pl";
import { FixedCostsTable } from "./fixed-costs-table";
import { VariableCostsTable } from "./variable-costs-table";
import { AiAnalysisSection } from "./ai-analysis-section";
import type { IFixedCost, IVariableCost } from "@/interfaces/cost.interface";

const DEFAULT_FILTER = { period: "30d" as const };

export function CostsContent() {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const { data: funnel, isLoading: funnelLoading } = useFunnel(orgId, DEFAULT_FILTER);
  const { data: fixedCosts, isLoading: fixedLoading } = useFixedCosts(orgId);
  const { data: variableCosts, isLoading: varLoading } = useVariableCosts(orgId);
  const { data: revenueSegments, isLoading: segmentsLoading } = useRevenueSegments(orgId, DEFAULT_FILTER);

  const grossRevenueInCents = funnel?.revenue ?? 0;

  const pl = useMemo(() => {
    if (!funnel || fixedLoading || varLoading || segmentsLoading) return null;
    if (!fixedCosts?.length && !variableCosts?.length) return null;
    return buildProfitAndLoss(
      grossRevenueInCents,
      (fixedCosts ?? []) as IFixedCost[],
      (variableCosts ?? []) as IVariableCost[],
      30,
      revenueSegments ?? undefined
    );
  }, [funnel, fixedCosts, variableCosts, grossRevenueInCents, fixedLoading, varLoading, segmentsLoading, revenueSegments]);

  const isAiLoading = funnelLoading || fixedLoading || varLoading || segmentsLoading;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Gerenciar Custos</h1>
        <p className="text-xs text-zinc-500">
          Cadastre custos fixos e variáveis para calcular o P&L no Financeiro
        </p>
      </div>

      {orgId && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <FixedCostsTable organizationId={orgId} />
          <VariableCostsTable organizationId={orgId} />
        </div>
      )}

      {!isAiLoading && pl && funnel && (
        <AiAnalysisSection
          pl={pl}
          funnel={funnel}
          filter={DEFAULT_FILTER}
          orgName={organization?.name ?? ""}
        />
      )}
    </div>
  );
}
