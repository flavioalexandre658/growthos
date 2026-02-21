import { useQuery } from "@tanstack/react-query";
import { getFunnel } from "@/actions/dashboard/get-funnel.action";
import { DashboardPeriod } from "@/interfaces/dashboard.interface";

export const getFunnelQueryKey = (period: DashboardPeriod) => ["dashboard", "funnel", period];

export function useFunnel(period: DashboardPeriod = "30d") {
  return useQuery({
    queryKey: getFunnelQueryKey(period),
    queryFn: () => getFunnel(period),
  });
}
