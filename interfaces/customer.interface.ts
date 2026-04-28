export interface ICustomer {
  id: string;
  organizationId: string;
  customerId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  avatarUrl: string | null;
  metadata: Record<string, unknown> | null;
  firstSource: string | null;
  firstMedium: string | null;
  firstCampaign: string | null;
  firstContent: string | null;
  firstLandingPage: string | null;
  firstReferrer: string | null;
  firstDevice: string | null;
  firstSessionId: string | null;
  firstClickId: string | null;
  firstClickIdType: string | null;
  firstTerm: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerListParams {
  search?: string;
  country?: string;
  sortBy?: "lastSeenAt" | "firstSeenAt" | "name" | "email";
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ICustomerListResult {
  data: ICustomer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface IUpsertCustomerInput {
  organizationId: string;
  customerId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  firstSource?: string | null;
  firstMedium?: string | null;
  firstCampaign?: string | null;
  firstContent?: string | null;
  firstLandingPage?: string | null;
  firstReferrer?: string | null;
  firstDevice?: string | null;
  firstSessionId?: string | null;
  firstClickId?: string | null;
  firstClickIdType?: string | null;
  firstTerm?: string | null;
  eventTimestamp?: Date;
}
