import { IDateFilter } from "@/interfaces/dashboard.interface";

export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== null) {
      qs.set(key, String(value));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export function dateFilterParams(filter: IDateFilter): Record<string, string | undefined> {
  const hasRange = filter.start_date && filter.end_date;
  if (hasRange) {
    return { start_date: filter.start_date, end_date: filter.end_date };
  }
  return { period: filter.period ?? "30d" };
}
