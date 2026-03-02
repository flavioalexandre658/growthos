export interface IMrrOverview {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  arpu: number;
  churnRate: number;
  revenueChurnRate: number;
  estimatedLtv: number;
  mrrGrowthRate: number;
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

export interface IActiveSubscription {
  subscriptionId: string;
  customerId: string;
  planName: string;
  planId: string;
  valueInCents: number;
  billingInterval: string;
  status: string;
  startedAt: Date;
}
