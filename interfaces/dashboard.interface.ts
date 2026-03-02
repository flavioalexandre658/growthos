export type DashboardPeriod = "today" | "yesterday" | "3d" | "7d" | "this_month" | "30d" | "90d";
export type OrderDirection = "ASC" | "DESC";

export interface IDateFilter {
  period?: DashboardPeriod;
  start_date?: string;
  end_date?: string;
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: IPaginationMeta;
}

export interface IBaseTableParams extends IDateFilter {
  page?: number;
  limit?: number;
  order_dir?: OrderDirection;
}

export interface IChannelParams extends IBaseTableParams {
  order_by?: "revenue" | "signups" | "payments" | "conversion_rate" | "ticket_medio";
  min_payments?: string; max_payments?: string;
  min_revenue?: string; max_revenue?: string;
  min_conversion_rate?: string; max_conversion_rate?: string;
}

export interface ILandingPageParams extends IBaseTableParams {
  order_by?: "revenue" | "pageviews" | "payments" | "conversion_rate";
  search?: string;
  min_payments?: string; max_payments?: string;
  min_revenue?: string; max_revenue?: string;
  min_conversion_rate?: string; max_conversion_rate?: string;
}

export interface IGenericFunnelStep {
  key: string;
  label: string;
  value: number;
}

export interface IGenericFunnelData {
  steps: IGenericFunnelStep[];
  rates: { key: string; label: string; value: string }[];
  revenue: number;
  netRevenue: number;
  ticketMedio: string;
  margin: string;
}

export interface IDailyData {
  date: string;
  signups: number;
  payments: number;
  revenue: number;
  net_revenue: number;
}

export interface IChannelData {
  channel: string;
  signups: number;
  payments: number;
  revenue: number;
  ticket_medio: number;
  conversion_rate: string;
}

export interface ILandingPageData {
  page: string;
  pageviews: number;
  signups: number;
  payments: number;
  revenue: number;
  conversion_rate: string;
}

export interface IPaymentMethodBreakdown {
  method: string;
  payments: number;
  revenue: number;
  percentage: string;
}

export interface ICategoryBreakdown {
  category: string;
  payments: number;
  revenue: number;
  percentage: string;
}

export interface IFinancialData {
  grossRevenueInCents: number;
  netRevenueInCents: number;
  totalGatewayFeesInCents: number;
  totalDiscountsInCents: number;
  lostRevenueInCents: number;
  averageTicketInCents: number;
  totalPayments: number;
  byPaymentMethod: IPaymentMethodBreakdown[];
  byCategory: ICategoryBreakdown[];
}
