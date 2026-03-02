import type {
  IFixedCost,
  IVariableCost,
  IProfitAndLoss,
  IPLCostBreakdown,
  IPLVariableBreakdown,
  IRevenueBySegment,
} from "@/interfaces/cost.interface";

export function buildProfitAndLoss(
  grossRevenueInCents: number,
  fixedCosts: IFixedCost[],
  variableCosts: IVariableCost[],
  periodDays: number,
  revenueBySegment?: IRevenueBySegment,
  eventCostsInCents: number = 0
): IProfitAndLoss {
  const fixedBreakdown: IPLCostBreakdown[] = fixedCosts.map((cost) => {
    const monthly = cost.type === "PERCENTAGE"
      ? Math.round((grossRevenueInCents * cost.amountInCents) / 10000)
      : cost.amountInCents;
    const calculatedInCents = Math.round((monthly * Math.min(periodDays, 30)) / 30);
    return {
      name: cost.name,
      amountInCents: cost.amountInCents,
      calculatedInCents,
      type: cost.type,
    };
  });

  const variableBreakdown: IPLVariableBreakdown[] = variableCosts.map((cost) => {
    let appliedRevenueInCents = grossRevenueInCents;

    if (cost.applyTo === "payment_method" && cost.applyToValue && revenueBySegment) {
      appliedRevenueInCents = revenueBySegment.paymentMethod[cost.applyToValue] ?? 0;
    } else if (cost.applyTo === "billing_type" && cost.applyToValue && revenueBySegment) {
      appliedRevenueInCents = revenueBySegment.billingType[cost.applyToValue] ?? 0;
    }

    const calculatedInCents = cost.type === "PERCENTAGE"
      ? Math.round((appliedRevenueInCents * cost.amountInCents) / 10000)
      : cost.amountInCents;

    return {
      name: cost.name,
      amountInCents: cost.amountInCents,
      calculatedInCents,
      type: cost.type,
      applyTo: cost.applyTo,
      applyToValue: cost.applyToValue,
      appliedRevenueInCents,
    };
  });

  const totalFixedCostsInCents = fixedBreakdown.reduce(
    (sum, c) => sum + c.calculatedInCents,
    0
  );
  const totalVariableCostsInCents = variableBreakdown.reduce(
    (sum, c) => sum + c.calculatedInCents,
    0
  );

  const operatingProfitInCents = grossRevenueInCents - eventCostsInCents - totalVariableCostsInCents;
  const netProfitInCents = grossRevenueInCents - eventCostsInCents - totalVariableCostsInCents - totalFixedCostsInCents;
  const marginPercent =
    grossRevenueInCents > 0
      ? Math.round((netProfitInCents / grossRevenueInCents) * 10000) / 100
      : 0;

  return {
    grossRevenueInCents,
    eventCostsInCents,
    totalFixedCostsInCents,
    totalVariableCostsInCents,
    operatingProfitInCents,
    netProfitInCents,
    marginPercent,
    fixedCostsBreakdown: fixedBreakdown,
    variableCostsBreakdown: variableBreakdown,
    periodDays,
  };
}
