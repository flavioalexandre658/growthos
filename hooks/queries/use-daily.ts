import { useQuery } from "@tanstack/react-query";
import { getDaily } from "@/actions/dashboard/get-daily.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getDailyQueryKey = (organizationId: string, filter: IDateFilter) => [
  "dashboard",
  "daily",
  organizationId,
  filter,
];

export function useDaily(organizationId: string | undefined, filter: IDateFilter = {}) {
  return useQuery({
    queryKey: getDailyQueryKey(organizationId ?? "", filter),
    queryFn: () => getDaily(organizationId!, filter),
    enabled: !!organizationId,
  });
}
