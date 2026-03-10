import dayjs from "@/utils/dayjs";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export interface IDateRange {
  startDate: Date;
  endDate: Date;
}

export function resolveDateRange(
  filter: IDateFilter = {},
  tz = "America/Sao_Paulo",
  maxHistoryDays?: number
): IDateRange {
  const now = dayjs().tz(tz);
  const earliest = maxHistoryDays
    ? now.subtract(maxHistoryDays, "day").startOf("day")
    : null;

  function clampStart(date: Date): Date {
    if (!earliest) return date;
    const d = dayjs(date);
    return d.isBefore(earliest) ? earliest.toDate() : date;
  }

  if (filter.start_date && filter.end_date) {
    return {
      startDate: clampStart(dayjs.tz(filter.start_date, tz).startOf("day").toDate()),
      endDate: dayjs.tz(filter.end_date, tz).endOf("day").toDate(),
    };
  }

  const period = filter.period ?? "30d";

  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "today":
      startDate = now.startOf("day").toDate();
      endDate = now.endOf("day").toDate();
      break;
    case "yesterday":
      startDate = now.subtract(1, "day").startOf("day").toDate();
      endDate = now.subtract(1, "day").endOf("day").toDate();
      break;
    case "3d":
      startDate = now.subtract(2, "day").startOf("day").toDate();
      endDate = now.endOf("day").toDate();
      break;
    case "7d":
      startDate = now.subtract(6, "day").startOf("day").toDate();
      endDate = now.endOf("day").toDate();
      break;
    case "14d":
      startDate = now.subtract(13, "day").startOf("day").toDate();
      endDate = now.endOf("day").toDate();
      break;
    case "this_week": {
      const dow = now.day();
      const diffToMon = dow === 0 ? 6 : dow - 1;
      startDate = now.subtract(diffToMon, "day").startOf("day").toDate();
      endDate = now.endOf("day").toDate();
      break;
    }
    case "last_week": {
      const dow2 = now.day();
      const diffToMon2 = dow2 === 0 ? 6 : dow2 - 1;
      const thisMonday = now.subtract(diffToMon2, "day");
      const lastMonday = thisMonday.subtract(7, "day");
      startDate = lastMonday.startOf("day").toDate();
      endDate = lastMonday.add(6, "day").endOf("day").toDate();
      break;
    }
    case "this_month":
      startDate = now.startOf("month").toDate();
      endDate = now.endOf("day").toDate();
      break;
    case "last_month":
      startDate = now.subtract(1, "month").startOf("month").toDate();
      endDate = now.subtract(1, "month").endOf("month").toDate();
      break;
    case "this_year":
      startDate = now.startOf("year").toDate();
      endDate = now.endOf("day").toDate();
      break;
    case "all_time":
      startDate = dayjs("2020-01-01").startOf("day").toDate();
      endDate = now.endOf("day").toDate();
      break;
    case "90d":
      startDate = now.subtract(89, "day").startOf("day").toDate();
      endDate = now.endOf("day").toDate();
      break;
    case "30d":
    default:
      startDate = now.subtract(29, "day").startOf("day").toDate();
      endDate = now.endOf("day").toDate();
      break;
  }

  return {
    startDate: clampStart(startDate),
    endDate,
  };
}
