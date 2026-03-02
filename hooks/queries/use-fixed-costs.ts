import { useQuery } from "@tanstack/react-query";
import { getFixedCosts } from "@/actions/costs/get-fixed-costs.action";

export const getFixedCostsQueryKey = (organizationId: string) => ["fixed-costs", organizationId];

export function useFixedCosts(organizationId: string | undefined) {
  return useQuery({
    queryKey: getFixedCostsQueryKey(organizationId ?? ""),
    queryFn: () => getFixedCosts(organizationId!),
    enabled: !!organizationId,
  });
}
