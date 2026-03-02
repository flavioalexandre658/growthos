import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateFixedCost } from "@/actions/costs/update-fixed-cost.action";
import { getFixedCostsQueryKey } from "@/hooks/queries/use-fixed-costs";

export const getUpdateFixedCostMutationKey = () => ["update-fixed-cost"];

export function useUpdateFixedCost(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: getUpdateFixedCostMutationKey(),
    mutationFn: updateFixedCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getFixedCostsQueryKey(organizationId) });
    },
  });
}
