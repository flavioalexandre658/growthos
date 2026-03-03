import type { IDateFilter, IPaginationMeta, OrderDirection } from "@/interfaces/dashboard.interface";

export interface IEvent {
  id: string;
  eventType: string;
  grossValueInCents: number | null;
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
}

export interface IEventsResult {
  data: IEvent[];
  pagination: IPaginationMeta;
  distinctEventTypes: string[];
  distinctSources: string[];
  distinctDevices: string[];
}

export interface IEventHealth {
  status: "receiving" | "idle" | "never";
  lastEventAt: Date | null;
  todayCount: number;
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
  errors: string[];
  warnings: string[];
}
