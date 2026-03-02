import { useQuery } from "@tanstack/react-query";
import { getMrrOverview } from "@/actions/dashboard/get-mrr-overview.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getMrrOverviewQueryKey = (organizationId: string, filter: IDateFilter) => [
  "dashboard",
  "mrr-overview",
  organizationId,
  filter,
];

export function useMrrOverview(organizationId: string | undefined, filter: IDateFilter = {}) {
  return useQuery({
    queryKey: getMrrOverviewQueryKey(organizationId ?? "", filter),
    queryFn: () => getMrrOverview(organizationId!, filter),
    enabled: !!organizationId,
  });
}
