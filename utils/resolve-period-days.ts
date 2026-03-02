import dayjs from "dayjs";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export function resolvePeriodDays(filter: IDateFilter = {}): number {
  if (filter.start_date && filter.end_date) {
    const diff = dayjs(filter.end_date).diff(dayjs(filter.start_date), "day") + 1;
    return Math.max(1, diff);
  }

  const period = filter.period ?? "30d";

  switch (period) {
    case "today":
    case "yesterday":
      return 1;
    case "3d":
      return 3;
    case "7d":
      return 7;
    case "this_month":
      return dayjs().daysInMonth();
    case "90d":
      return 90;
    case "30d":
    default:
      return 30;
  }
}
