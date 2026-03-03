import { useQuery } from "@tanstack/react-query";
import { getRevenueComparison } from "@/actions/dashboard/get-revenue-comparison.action";

export const getRevenueComparisonQueryKey = (organizationId: string) => [
  "dashboard",
  "revenue-comparison",
  organizationId,
];

export function useRevenueComparison(organizationId: string | undefined) {
  return useQuery({
    queryKey: getRevenueComparisonQueryKey(organizationId ?? ""),
    queryFn: () => getRevenueComparison(organizationId!),
    enabled: !!organizationId,
  });
}
