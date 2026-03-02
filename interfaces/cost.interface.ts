export type CostValueType = "VALUE" | "PERCENTAGE";

export interface IFixedCost {
  id: string;
  organizationId: string;
  name: string;
  amountInCents: number;
  type: CostValueType;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVariableCost {
  id: string;
  organizationId: string;
  name: string;
  amountInCents: number;
  type: CostValueType;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateCost {
  organizationId: string;
  name: string;
  amountInCents: number;
  type: CostValueType;
  description?: string;
}

export interface IUpdateCost {
  name?: string;
  amountInCents?: number;
  type?: CostValueType;
  description?: string;
}

export interface IProfitAndLoss {
  grossRevenueInCents: number;
  totalFixedCostsInCents: number;
  totalVariableCostsInCents: number;
  grossProfitInCents: number;
  realProfitInCents: number;
  marginPercent: number;
  fixedCostsBreakdown: IPLCostBreakdown[];
  variableCostsBreakdown: IPLCostBreakdown[];
}

export interface IPLCostBreakdown {
  name: string;
  amountInCents: number;
  calculatedInCents: number;
  type: CostValueType;
}
