export type DashboardPeriod = "today" | "7d" | "30d" | "90d";
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

export interface ITemplateParams extends IBaseTableParams {
  order_by?: "revenue" | "net_revenue" | "edits" | "payments" | "views" | "view_to_edit" | "edit_to_payment" | "rpm";
  category_id?: string;
  name?: string;
}

export interface IOpportunityParams extends IBaseTableParams {
  order_by?: "edits" | "edit_to_payment" | "estimated_lost_revenue" | "views" | "payments";
  category_id?: string;
  name?: string;
}

export interface ICategoryParams extends IBaseTableParams {
  order_by?: "revenue" | "net_revenue" | "edits" | "payments" | "conversion_rate" | "ticket_medio";
}

export interface IChannelParams extends IBaseTableParams {
  order_by?: "revenue" | "edits" | "payments" | "conversion_rate" | "ticket_medio";
}

export interface ILandingPageParams extends IBaseTableParams {
  order_by?: "revenue" | "edits" | "payments" | "conversion_rate";
  search?: string;
}

export interface IFunnelRates {
  signup_to_edit: string;
  edit_to_payment: string;
  signup_to_payment: string;
}

export interface IFunnelData {
  period: DashboardPeriod;
  signups: number;
  edits: number;
  payments: number;
  revenue: number;
  net_revenue: number;
  rates: IFunnelRates;
  ticket_medio: string;
  margin: string;
}

export interface IDailyData {
  date: string;
  signups: number;
  edits: number;
  payments: number;
  revenue: number;
  net_revenue: number;
}

export interface ITemplateData {
  uuid: string;
  name: string;
  slug: string;
  price: number;
  views: number;
  category: string;
  edits: number;
  payments: number;
  revenue: number;
  net_revenue: number;
  view_to_edit: string;
  edit_to_payment: string;
  view_to_payment: string;
  rpm: string;
}

export interface IOpportunityData {
  uuid: string;
  name: string;
  slug: string;
  price: number;
  views: number;
  edits: number;
  payments: number;
  edit_to_payment_rate: string;
}

export interface ICategoryData {
  uuid: string;
  name: string;
  slug: string;
  edits: number;
  payments: number;
  revenue: number;
  net_revenue: number;
  ticket_medio: number;
  conversion_rate: string;
}

export interface IChannelData {
  channel: string;
  edits: number;
  payments: number;
  revenue: number;
  ticket_medio: number;
  conversion_rate: string;
}

export interface ILandingPageData {
  page: string;
  edits: number;
  payments: number;
  revenue: number;
  conversion_rate: string;
}
