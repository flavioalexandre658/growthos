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
    case "14d":
      return 14;
    case "this_week": {
      const now = dayjs().tz(tz);
      const dow = now.day();
      const diffToMon = dow === 0 ? 6 : dow - 1;
      return diffToMon + 1;
    }
    case "last_week":
      return 7;
    case "this_month":
      return dayjs().tz(tz).date();
    case "last_month":
      return dayjs().tz(tz).subtract(1, "month").daysInMonth();
    case "this_year": {
      const today = dayjs().tz(tz);
      return today.diff(today.startOf("year"), "day") + 1;
    }
    case "all_time":
      return dayjs().tz(tz).diff(dayjs("2020-01-01"), "day") + 1;
    case "90d":
      return 90;
    case "30d":
    default:
      return 30;
  }
}
