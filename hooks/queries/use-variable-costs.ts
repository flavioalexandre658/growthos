import { useQuery } from "@tanstack/react-query";
import { getVariableCosts } from "@/actions/costs/get-variable-costs.action";

export const getVariableCostsQueryKey = (organizationId: string) => ["variable-costs", organizationId];

export function useVariableCosts(organizationId: string | undefined) {
  return useQuery({
    queryKey: getVariableCostsQueryKey(organizationId ?? ""),
    queryFn: () => getVariableCosts(organizationId!),
    enabled: !!organizationId,
  });
}
