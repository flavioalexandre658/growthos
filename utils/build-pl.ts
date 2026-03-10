import type {
  IFixedCost,
  IVariableCost,
  IProfitAndLoss,
  IPLCostBreakdown,
  IPLVariableBreakdown,
  IRevenueBySegment,
  FixedCostFrequency,
  IMarketingSpendSummary,
} from "@/interfaces/cost.interface";

const FREQUENCY_MONTHS: Record<FixedCostFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export function buildProfitAndLoss(
  grossRevenueInCents: number,
  fixedCosts: IFixedCost[],
  variableCosts: IVariableCost[],
  periodDays: number,
  revenueBySegment?: IRevenueBySegment,
  eventCostsInCents: number = 0,
  marketingBreakdown: IMarketingSpendSummary[] = []
): IProfitAndLoss {
  const fixedBreakdown: IPLCostBreakdown[] = fixedCosts.map((cost) => {
    const frequency: FixedCostFrequency = (cost.frequency as FixedCostFrequency) ?? "monthly";
    const frequencyMonths = FREQUENCY_MONTHS[frequency];
    const monthly = cost.type === "PERCENTAGE"
      ? Math.round((grossRevenueInCents * cost.amountInCents) / 10000)
      : Math.round(cost.amountInCents / frequencyMonths);
    const calculatedInCents = Math.round((monthly * Math.min(periodDays, 30)) / 30);
    return {
      name: cost.name,
      amountInCents: cost.amountInCents,
      calculatedInCents,
      type: cost.type,
      frequency,
    };
  });

  const variableBreakdown: IPLVariableBreakdown[] = variableCosts.map((cost) => {
    let appliedRevenueInCents = grossRevenueInCents;

    if (cost.applyTo === "payment_method" && cost.applyToValue && revenueBySegment) {
      appliedRevenueInCents = revenueBySegment.paymentMethod[cost.applyToValue] ?? 0;
    } else if (cost.applyTo === "billing_type" && cost.applyToValue && revenueBySegment) {
      appliedRevenueInCents = revenueBySegment.billingType[cost.applyToValue] ?? 0;
    } else if (cost.applyTo === "category" && cost.applyToValue && revenueBySegment?.category) {
      appliedRevenueInCents = revenueBySegment.category[cost.applyToValue] ?? 0;
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
  const marketingSpendInCents = marketingBreakdown.reduce(
    (sum, m) => sum + m.totalAmountInCents,
    0
  );

  const operatingProfitInCents = grossRevenueInCents - eventCostsInCents - totalVariableCostsInCents;
  const netProfitInCents = grossRevenueInCents - eventCostsInCents - totalVariableCostsInCents - marketingSpendInCents - totalFixedCostsInCents;
  const marginPercent =
    grossRevenueInCents > 0
      ? Math.round((netProfitInCents / grossRevenueInCents) * 10000) / 100
      : 0;

  return {
    grossRevenueInCents,
    eventCostsInCents,
    totalFixedCostsInCents,
    totalVariableCostsInCents,
    marketingSpendInCents,
    marketingBreakdown,
    operatingProfitInCents,
    netProfitInCents,
    marginPercent,
    fixedCostsBreakdown: fixedBreakdown,
    variableCostsBreakdown: variableBreakdown,
    periodDays,
  };
}
