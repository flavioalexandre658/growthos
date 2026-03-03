import { useQuery } from "@tanstack/react-query";
import { getCostsSummary } from "@/actions/costs/get-costs-summary.action";

export const getCostsSummaryQueryKey = (organizationId: string) => ["costs-summary", organizationId];

export function useCostsSummary(organizationId: string | undefined) {
  return useQuery({
    queryKey: getCostsSummaryQueryKey(organizationId ?? ""),
    queryFn: () => getCostsSummary(organizationId!),
    enabled: !!organizationId,
  });
}
