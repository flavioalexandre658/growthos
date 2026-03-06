import type { IPublicPageSettings } from "@/db/schema/organization.schema";

export type { IPublicPageSettings };

export interface IPublicOrgData {
  name: string;
  slug: string;
  description: string | null;
  verified: boolean;
  currency: string;
  locale: string;
  createdAt: string;
}

export interface IPublicMetricValue {
  value: number | string;
  label?: string;
}

export interface IPublicMetrics {
  mrr?: IPublicMetricValue | null;
  activeSubscriptions?: IPublicMetricValue | null;
  churnRate?: number | null;
  arpu?: IPublicMetricValue | null;
  mrrGrowthRate?: number | null;
}

export interface IPublicMrrEntry {
  date: string;
  mrr: number;
}

export interface IPublicSankey {
  newSubscriptions: number;
  renewalSubscriptions: number;
  activeSubscriptions: number;
  churnedSubscriptions: number;
  pastDueSubscriptions: number;
  mrr: number;
}

export interface IPublicPageData {
  org: IPublicOrgData;
  metrics: IPublicMetrics;
  charts: {
    mrrHistory: IPublicMrrEntry[] | null;
    sankey: IPublicSankey | null;
  };
  settings: IPublicPageSettings;
  updatedAt: string;
}
