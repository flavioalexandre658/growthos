import type { IAiProfile } from "./ai.interface";

export interface IFunnelStep {
  eventType: string;
  label: string;
  countUnique?: boolean;
  hidden?: boolean;
}

export interface IOrganization {
  id: string;
  name: string;
  slug: string;
  funnelSteps: IFunnelStep[];
  timezone: string;
  hasRecurringRevenue: boolean;
  aiProfile?: IAiProfile;
  createdAt: Date;
  updatedAt: Date;
}
