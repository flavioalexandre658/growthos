import { useQuery } from "@tanstack/react-query";
import { getChannels } from "@/actions/dashboard/get-channels.action";
import { DashboardPeriod } from "@/interfaces/dashboard.interface";

export const getChannelsQueryKey = (period: DashboardPeriod) => ["dashboard", "channels", period];

export function useChannels(period: DashboardPeriod = "30d") {
  return useQuery({
    queryKey: getChannelsQueryKey(period),
    queryFn: () => getChannels(period),
  });
}
