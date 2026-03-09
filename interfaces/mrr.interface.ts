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
  totalContractionMrr?: number;
  totalChurnedMrr?: number;
  pastDueSubscriptions?: number;
  newSubscriptions?: number;
  churnedSubscriptions?: number;
  renewalSubscriptions?: number;
  totalPeriodRevenue?: number;
  totalPurchaseCount?: number;
  previousPeriodRevenue?: number;
  nrr?: number;
  previousNrr?: number;
  forecastNext30dRevenue?: number;
  forecastNext30dCount?: number;
}

export interface IMrrMovementEntry {
  date: string;
  newMrr: number;
  renewalMrr: number;
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

export type BillingIntervalFilter = "all" | "monthly" | "quarterly" | "semiannual" | "yearly" | "weekly";

export type NextBillingFilter = "all" | "today" | "7d" | "30d";

export type SubscriptionSortField = "nextBilling" | "value" | "ltv" | "renewals" | "startedAt";

export type SortDirection = "asc" | "desc";

export interface IActiveSubscription {
  subscriptionId: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
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

export interface IAvailablePlan {
  planId: string;
  planName: string;
  count: number;
}
