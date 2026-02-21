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

export interface ITemplateParams extends IBaseTableParams {
  order_by?: "revenue" | "net_revenue" | "edits" | "payments" | "views" | "view_to_edit" | "edit_to_payment" | "rpm";
  category_id?: string;
  name?: string;
  min_views?: string; max_views?: string;
  min_edits?: string; max_edits?: string;
  min_payments?: string; max_payments?: string;
  min_revenue?: string; max_revenue?: string;
  min_net_revenue?: string; max_net_revenue?: string;
  min_edit_to_payment?: string; max_edit_to_payment?: string;
  min_view_to_edit?: string; max_view_to_edit?: string;
  min_view_to_payment?: string; max_view_to_payment?: string;
  min_rpm?: string; max_rpm?: string;
}

export interface IOpportunityParams extends IBaseTableParams {
  order_by?: "edits" | "edit_to_payment" | "estimated_lost_revenue" | "views" | "payments";
  category_id?: string;
  name?: string;
  min_views?: string; max_views?: string;
  min_edits?: string; max_edits?: string;
  min_payments?: string; max_payments?: string;
  min_revenue?: string; max_revenue?: string;
  min_net_revenue?: string; max_net_revenue?: string;
  min_edit_to_payment?: string; max_edit_to_payment?: string;
  min_view_to_edit?: string; max_view_to_edit?: string;
  min_view_to_payment?: string; max_view_to_payment?: string;
  min_rpm?: string; max_rpm?: string;
}

export interface ICategoryParams extends IBaseTableParams {
  order_by?: "revenue" | "net_revenue" | "edits" | "payments" | "conversion_rate" | "ticket_medio";
  min_edits?: string; max_edits?: string;
  min_payments?: string; max_payments?: string;
  min_revenue?: string; max_revenue?: string;
  min_net_revenue?: string; max_net_revenue?: string;
  min_conversion_rate?: string; max_conversion_rate?: string;
  min_ticket_medio?: string; max_ticket_medio?: string;
}

export interface IChannelParams extends IBaseTableParams {
  order_by?: "revenue" | "edits" | "payments" | "conversion_rate" | "ticket_medio";
  min_edits?: string; max_edits?: string;
  min_payments?: string; max_payments?: string;
  min_revenue?: string; max_revenue?: string;
  min_conversion_rate?: string; max_conversion_rate?: string;
  min_ticket_medio?: string; max_ticket_medio?: string;
}

export interface ILandingPageParams extends IBaseTableParams {
  order_by?: "revenue" | "edits" | "payments" | "conversion_rate";
  search?: string;
  min_edits?: string; max_edits?: string;
  min_payments?: string; max_payments?: string;
  min_revenue?: string; max_revenue?: string;
  min_conversion_rate?: string; max_conversion_rate?: string;
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
