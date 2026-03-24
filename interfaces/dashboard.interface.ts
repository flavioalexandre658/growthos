export type DashboardPeriod =
  | "today"
  | "yesterday"
  | "3d"
  | "7d"
  | "14d"
  | "30d"
  | "90d"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "all_time";
export type OrderDirection = "ASC" | "DESC";

export interface IStepMeta {
  key: string;
  label: string;
}

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
  order_by?: string;
  search?: string;
  min_revenue?: string; max_revenue?: string;
  min_conversion_rate?: string; max_conversion_rate?: string;
}

export interface ILandingPageParams extends IBaseTableParams {
  order_by?: string;
  search?: string;
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
  ticketMedio: number;
  checkoutAbandoned?: number;
  previousSteps?: { key: string; value: number }[];
  previousRevenue?: number;
}

export interface ITopProduct {
  productName: string;
  purchases: number;
  revenueInCents: number;
}

export interface IDailyData {
  date: string;
  steps: Record<string, number>;
  revenue: number;
}

export interface IDailyResult {
  rows: IDailyData[];
  stepMeta: IStepMeta[];
}

export interface IChannelData {
  channel: string;
  steps: Record<string, number>;
  revenue: number;
  ticket_medio: number;
  conversion_rate: string;
  previousRevenue?: number;
  investment?: number;
  roi?: number | null;
  customersCount?: number;
  cac?: number | null;
  avgLtv?: number;
  churnRate?: string | null;
  paybackMonths?: number | null;
}

export interface ICampaignData {
  campaign: string;
  revenue: number;
  purchases: number;
}

export interface IChannelInvestmentGroup {
  source: string;
  label: string;
  investmentInCents: number;
  revenueInCents: number;
  roi: number | null;
  channelKeys: string[];
}

export interface IChannelsResult {
  data: IChannelData[];
  pagination: IPaginationMeta;
  stepMeta: IStepMeta[];
  totalRevenue: number;
  channelsWithRevenue: number;
  topChannel: string;
  concentrationTop2: number;
  investmentGroups: IChannelInvestmentGroup[];
}

export interface ILandingPageData {
  page: string;
  steps: Record<string, number>;
  revenue: number;
  conversion_rate: string;
}

export interface IPageScatterPoint {
  page: string;
  visits: number;
  conversionRate: number;
  revenue: number;
}

export interface ILandingPagesResult {
  data: ILandingPageData[];
  pagination: IPaginationMeta;
  stepMeta: IStepMeta[];
  totalPages: number;
  pagesWithRevenue: number;
  totalRevenue: number;
  bestConversionPage: string;
  bestConversionRate: string;
  biggestOpportunityPage: string;
  biggestOpportunityVisits: number;
  scatterData: IPageScatterPoint[];
}

export interface IPaymentMethodBreakdown {
  method: string;
  purchases: number;
  revenue: number;
  percentage: string;
}

export interface ICategoryBreakdown {
  category: string;
  purchases: number;
  revenue: number;
  percentage: string;
  marginPercentage?: string;
}

export interface IRevenueByBillingType {
  recurring: number;
  oneTime: number;
}

export interface ISourceEntry {
  source: string;
  count: number;
  percentage: number;
  revenueInCents: number;
}

export interface ISourceDistribution {
  sources: ISourceEntry[];
  total: number;
}

export interface IRevenueWindow {
  label: string;
  period: "7d" | "30d" | "90d";
  current: number;
  previous: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
}

export interface IRecentPurchase {
  id: string;
  productName: string | null;
  grossValueInCents: number;
  source: string | null;
  createdAt: Date;
}

export interface IRevenueComparison {
  windows: IRevenueWindow[];
  recentPurchases: IRecentPurchase[];
}

export interface IFinancialData {
  grossRevenueInCents: number;
  totalDiscountsInCents: number;
  lostRevenueInCents: number;
  averageTicketInCents: number;
  totalPurchases: number;
  byPaymentMethod: IPaymentMethodBreakdown[];
  byCategory: ICategoryBreakdown[];
  revenueByBillingType: IRevenueByBillingType;
  pl: import("@/interfaces/cost.interface").IProfitAndLoss | null;
  periodDays: number;
  previousGrossRevenueInCents?: number;
  previousTotalPurchases?: number;
  previousAverageTicketInCents?: number;
  previousLostRevenueInCents?: number;
  previousNetProfitInCents?: number;
  previousMarginPercent?: number;
  previousRecurringRevenueInCents?: number;
  previousOneTimeRevenueInCents?: number;
}
