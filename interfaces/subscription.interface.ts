import type { IDateFilter, IPaginationMeta, OrderDirection } from "@/interfaces/dashboard.interface";

export interface ISubscriptionListItem {
  id: string;
  subscriptionId: string;
  customerId: string;
  planId: string;
  planName: string;
  status: string;
  valueInCents: number;
  currency: string;
  billingInterval: string;
  startedAt: Date;
  canceledAt: Date | null;
  createdAt: Date;
}

export interface ISubscriptionParams extends IDateFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plan_id?: string;
  billing_interval?: string;
  order_dir?: OrderDirection;
}

export interface ISubscriptionsResult {
  data: ISubscriptionListItem[];
  pagination: IPaginationMeta;
  distinctPlans: { planId: string; planName: string }[];
  distinctIntervals: string[];
}
