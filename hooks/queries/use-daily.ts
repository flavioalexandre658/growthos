import { useQuery } from "@tanstack/react-query";
import { getDaily } from "@/actions/dashboard/get-daily.action";
import { DashboardPeriod } from "@/interfaces/dashboard.interface";

export const getDailyQueryKey = (period: DashboardPeriod) => ["dashboard", "daily", period];

export function useDaily(period: DashboardPeriod = "30d") {
  return useQuery({
    queryKey: getDailyQueryKey(period),
    queryFn: () => getDaily(period),
  });
}
