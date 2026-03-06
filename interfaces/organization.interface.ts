import type { IAiProfile } from "./ai.interface";
import type { IPublicPageSettings } from "./public-page.interface";

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
  currency: string;
  locale: string;
  country: string;
  language: string;
  hasRecurringRevenue: boolean;
  aiProfile?: IAiProfile;
  publicPageEnabled: boolean;
  publicPageSettings?: IPublicPageSettings;
  publicDescription?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
