import { useQuery } from "@tanstack/react-query";
import { getTopCampaigns } from "@/actions/dashboard/get-top-campaigns.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getTopCampaignsQueryKey = (organizationId: string, params: IDateFilter) => [
  "dashboard",
  "top-campaigns",
  organizationId,
  params,
];

export function useTopCampaigns(organizationId: string | undefined, params: IDateFilter = {}) {
  return useQuery({
    queryKey: getTopCampaignsQueryKey(organizationId ?? "", params),
    queryFn: () => getTopCampaigns(organizationId!, params),
    enabled: !!organizationId,
    placeholderData: (prev) => prev,
  });
}
