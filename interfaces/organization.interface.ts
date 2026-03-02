export interface IFunnelStep {
  eventType: string;
  label: string;
  countUnique?: boolean;
}

export interface IOrganization {
  id: string;
  name: string;
  slug: string;
  funnelSteps: IFunnelStep[];
  hasRecurringRevenue: boolean;
  createdAt: Date;
  updatedAt: Date;
}
