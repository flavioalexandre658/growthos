import { useQuery } from "@tanstack/react-query";
import { getDaily } from "@/actions/dashboard/get-daily.action";
import { IDateFilter } from "@/interfaces/dashboard.interface";

export const getDailyQueryKey = (filter: IDateFilter) => ["dashboard", "daily", filter];

export function useDaily(filter: IDateFilter = {}) {
  return useQuery({
    queryKey: getDailyQueryKey(filter),
    queryFn: () => getDaily(filter),
  });
}
