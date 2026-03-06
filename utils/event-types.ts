export const REVENUE_EVENT_TYPES = ["purchase", "renewal"] as const;
export type RevenueEventType = (typeof REVENUE_EVENT_TYPES)[number];
