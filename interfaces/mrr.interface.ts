export interface IMrrOverview {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  arpu: number;
  churnRate: number;
  revenueChurnRate: number;
  estimatedLtv: number;
  mrrGrowthRate: number;
  previousMrr?: number;
  previousArr?: number;
  previousArpu?: number;
  previousChurnRate?: number;
  previousRevenueChurnRate?: number;
  previousEstimatedLtv?: number;
  previousActiveSubscriptions?: number;
  totalNewMrr?: number;
  totalExpansionMrr?: number;
  totalChurnedMrr?: number;
  totalContractionMrr?: number;
  pastDueSubscriptions?: number;
}

export interface IMrrMovementEntry {
  date: string;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  netMrr: number;
}

export interface IMrrGrowthEntry {
  date: string;
  mrr: number;
}

export type SubscriptionStatusFilter = "all" | "active" | "trialing" | "past_due" | "canceled";

export interface IActiveSubscription {
  subscriptionId: string;
  customerId: string;
  planName: string;
  planId: string;
  valueInCents: number;
  billingInterval: string;
  status: string;
  startedAt: Date;
  canceledAt?: Date | null;
  renewalCount: number;
  nextBillingAt: Date | null;
  estimatedLtvInCents: number;
}
