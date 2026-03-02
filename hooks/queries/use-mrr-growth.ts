import { useQuery } from "@tanstack/react-query";
import { getMrrGrowth } from "@/actions/dashboard/get-mrr-growth.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getMrrGrowthQueryKey = (organizationId: string, filter: IDateFilter) => [
  "dashboard",
  "mrr-growth",
  organizationId,
  filter,
];

export function useMrrGrowth(organizationId: string | undefined, filter: IDateFilter = {}) {
  return useQuery({
    queryKey: getMrrGrowthQueryKey(organizationId ?? "", filter),
    queryFn: () => getMrrGrowth(organizationId!, filter),
    enabled: !!organizationId,
  });
}
