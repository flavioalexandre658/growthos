export type DashboardPeriod = "today" | "7d" | "30d" | "90d";

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
