import { useQuery } from "@tanstack/react-query";
import { getSourceDistribution } from "@/actions/dashboard/get-source-distribution.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getSourceDistributionQueryKey = (
  organizationId: string,
  filter: IDateFilter
) => ["dashboard", "source-distribution", organizationId, filter];

export function useSourceDistribution(
  organizationId: string | undefined,
  filter: IDateFilter = {}
) {
  return useQuery({
    queryKey: getSourceDistributionQueryKey(organizationId ?? "", filter),
    queryFn: () => getSourceDistribution(organizationId!, filter),
    enabled: !!organizationId,
  });
}
