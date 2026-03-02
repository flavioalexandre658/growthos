import { useQuery } from "@tanstack/react-query";
import { getFunnel } from "@/actions/dashboard/get-funnel.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getFunnelQueryKey = (organizationId: string, filter: IDateFilter) => [
  "dashboard",
  "funnel",
  organizationId,
  filter,
];

export function useFunnel(organizationId: string | undefined, filter: IDateFilter = {}) {
  return useQuery({
    queryKey: getFunnelQueryKey(organizationId ?? "", filter),
    queryFn: () => getFunnel(organizationId!, filter),
    enabled: !!organizationId,
  });
}
