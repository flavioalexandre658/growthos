export interface IFunnelStep {
  eventType: string;
  label: string;
}

export interface IOrganization {
  id: string;
  name: string;
  slug: string;
  funnelSteps: IFunnelStep[];
  createdAt: Date;
  updatedAt: Date;
}
