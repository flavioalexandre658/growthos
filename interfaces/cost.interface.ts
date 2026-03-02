export type CostValueType = "VALUE" | "PERCENTAGE";
export type VariableCostApplyTo = "all" | "payment_method" | "billing_type";

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
  applyTo: VariableCostApplyTo;
  applyToValue: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateFixedCost {
  organizationId: string;
  name: string;
  amountInCents: number;
  type: CostValueType;
  description?: string;
}

export interface ICreateVariableCost {
  organizationId: string;
  name: string;
  amountInCents: number;
  type: CostValueType;
  applyTo: VariableCostApplyTo;
  applyToValue?: string | null;
  description?: string;
}

export interface IUpdateFixedCost {
  name?: string;
  amountInCents?: number;
  type?: CostValueType;
  description?: string;
}

export interface IUpdateVariableCost {
  name?: string;
  amountInCents?: number;
  type?: CostValueType;
  applyTo?: VariableCostApplyTo;
  applyToValue?: string | null;
  description?: string;
}

export interface IRevenueBySegment {
  paymentMethod: Record<string, number>;
  billingType: Record<string, number>;
}

export interface IProfitAndLoss {
  grossRevenueInCents: number;
  eventCostsInCents: number;
  totalFixedCostsInCents: number;
  totalVariableCostsInCents: number;
  operatingProfitInCents: number;
  netProfitInCents: number;
  marginPercent: number;
  fixedCostsBreakdown: IPLCostBreakdown[];
  variableCostsBreakdown: IPLVariableBreakdown[];
  periodDays: number;
}

export interface IPLCostBreakdown {
  name: string;
  amountInCents: number;
  calculatedInCents: number;
  type: CostValueType;
}

export interface IPLVariableBreakdown {
  name: string;
  amountInCents: number;
  calculatedInCents: number;
  type: CostValueType;
  applyTo: VariableCostApplyTo;
  applyToValue: string | null;
  appliedRevenueInCents: number;
}
