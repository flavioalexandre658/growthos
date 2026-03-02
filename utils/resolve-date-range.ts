import dayjs from "dayjs";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export interface IDateRange {
  startDate: Date;
  endDate: Date;
}

export function resolveDateRange(filter: IDateFilter = {}): IDateRange {
  const now = dayjs();

  if (filter.start_date && filter.end_date) {
    return {
      startDate: dayjs(filter.start_date).startOf("day").toDate(),
      endDate: dayjs(filter.end_date).endOf("day").toDate(),
    };
  }

  const period = filter.period ?? "30d";

  switch (period) {
    case "today":
      return {
        startDate: now.startOf("day").toDate(),
        endDate: now.endOf("day").toDate(),
      };
    case "yesterday":
      return {
        startDate: now.subtract(1, "day").startOf("day").toDate(),
        endDate: now.subtract(1, "day").endOf("day").toDate(),
      };
    case "3d":
      return {
        startDate: now.subtract(2, "day").startOf("day").toDate(),
        endDate: now.endOf("day").toDate(),
      };
    case "7d":
      return {
        startDate: now.subtract(6, "day").startOf("day").toDate(),
        endDate: now.endOf("day").toDate(),
      };
    case "this_month":
      return {
        startDate: now.startOf("month").toDate(),
        endDate: now.endOf("month").toDate(),
      };
    case "90d":
      return {
        startDate: now.subtract(89, "day").startOf("day").toDate(),
        endDate: now.endOf("day").toDate(),
      };
    case "30d":
    default:
      return {
        startDate: now.subtract(29, "day").startOf("day").toDate(),
        endDate: now.endOf("day").toDate(),
      };
  }
}
