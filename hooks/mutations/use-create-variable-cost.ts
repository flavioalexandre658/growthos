import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVariableCost } from "@/actions/costs/create-variable-cost.action";
import { getVariableCostsQueryKey } from "@/hooks/queries/use-variable-costs";

export const getCreateVariableCostMutationKey = () => ["create-variable-cost"];

export function useCreateVariableCost(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: getCreateVariableCostMutationKey(),
    mutationFn: createVariableCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getVariableCostsQueryKey(organizationId) });
    },
  });
}
