import { useQuery } from "@tanstack/react-query";
import { getRevenueSegments } from "@/actions/dashboard/get-revenue-segments.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getRevenueSegmentsQueryKey = (orgId: string | undefined, filter: IDateFilter) => [
  "revenue-segments",
  orgId,
  filter,
];

export function useRevenueSegments(orgId: string | undefined, filter: IDateFilter) {
  return useQuery({
    queryKey: getRevenueSegmentsQueryKey(orgId, filter),
    queryFn: () => getRevenueSegments(orgId!, filter),
    enabled: !!orgId,
  });
}
