import dayjs from "@/utils/dayjs";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export function resolvePeriodDays(filter: IDateFilter = {}, tz = "America/Sao_Paulo"): number {
  if (filter.start_date && filter.end_date) {
    const diff = dayjs.tz(filter.end_date, tz).diff(dayjs.tz(filter.start_date, tz), "day") + 1;
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
      return dayjs().tz(tz).daysInMonth();
    case "90d":
      return 90;
    case "30d":
    default:
      return 30;
  }
}
