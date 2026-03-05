import type { IDateFilter, IPaginationMeta, OrderDirection } from "@/interfaces/dashboard.interface";

export interface IEvent {
  id: string;
  eventType: string;
  grossValueInCents: number | null;
  currency: string;
  baseCurrency: string;
  baseGrossValueInCents: number | null;
  billingType: string | null;
  billingReason: string | null;
  billingInterval: string | null;
  subscriptionId: string | null;
  provider: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  productName: string | null;
  productId: string | null;
  category: string | null;
  device: string | null;
  customerId: string | null;
  sessionId: string | null;
  landingPage: string | null;
  paymentMethod: string | null;
  createdAt: Date;
  possibleDuplicate: boolean;
  isRetry: boolean;
}

export interface IEventParams extends IDateFilter {
  page?: number;
  limit?: number;
  order_dir?: OrderDirection;
  event_types?: string[];
  source?: string;
  device?: string;
  search?: string;
  min_value?: number;
  max_value?: number;
  billing_type?: "recurring" | "one_time";
  provider?: string;
}

export interface IEventsResult {
  data: IEvent[];
  pagination: IPaginationMeta;
  distinctEventTypes: string[];
  distinctSources: string[];
  distinctDevices: string[];
  distinctProviders: string[];
}

export interface IEventHealth {
  status: "receiving" | "stale" | "idle" | "never";
  lastEventAt: Date | null;
  todayCount: number;
  minutesSinceLastEvent?: number;
  hourlyVolume: { hour: string; count: number }[];
}

export interface IDebugErrorHint {
  message: string;
  suggestion: string;
  link?: { label: string; href: string };
}

export interface IDebugResult {
  pageAccessible: boolean;
  httpStatus: number | null;
  trackerFound: boolean;
  scriptSrc: string | null;
  apiKeyFound: boolean;
  apiKeyValue: string | null;
  keyValid: boolean;
  keyBelongsToOrg: boolean;
  keyExpired: boolean;
  errors: IDebugErrorHint[];
  warnings: string[];
}
