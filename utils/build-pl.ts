import type { IFixedCost, IVariableCost, IProfitAndLoss, IPLCostBreakdown } from "@/interfaces/cost.interface";

export function buildProfitAndLoss(
  grossRevenueInCents: number,
  fixedCosts: IFixedCost[],
  variableCosts: IVariableCost[]
): IProfitAndLoss {
  const fixedBreakdown: IPLCostBreakdown[] = fixedCosts.map((cost) => ({
    name: cost.name,
    amountInCents: cost.amountInCents,
    calculatedInCents:
      cost.type === "PERCENTAGE"
        ? Math.round((grossRevenueInCents * cost.amountInCents) / 10000)
        : cost.amountInCents,
    type: cost.type,
  }));

  const variableBreakdown: IPLCostBreakdown[] = variableCosts.map((cost) => ({
    name: cost.name,
    amountInCents: cost.amountInCents,
    calculatedInCents:
      cost.type === "PERCENTAGE"
        ? Math.round((grossRevenueInCents * cost.amountInCents) / 10000)
        : cost.amountInCents,
    type: cost.type,
  }));

  const totalFixedCostsInCents = fixedBreakdown.reduce(
    (sum, c) => sum + c.calculatedInCents,
    0
  );
  const totalVariableCostsInCents = variableBreakdown.reduce(
    (sum, c) => sum + c.calculatedInCents,
    0
  );

  const grossProfitInCents = grossRevenueInCents - totalVariableCostsInCents;
  const realProfitInCents = grossRevenueInCents - totalFixedCostsInCents - totalVariableCostsInCents;
  const marginPercent =
    grossRevenueInCents > 0
      ? Math.round((realProfitInCents / grossRevenueInCents) * 10000) / 100
      : 0;

  return {
    grossRevenueInCents,
    totalFixedCostsInCents,
    totalVariableCostsInCents,
    grossProfitInCents,
    realProfitInCents,
    marginPercent,
    fixedCostsBreakdown: fixedBreakdown,
    variableCostsBreakdown: variableBreakdown,
  };
}
