import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateVariableCost } from "@/actions/costs/update-variable-cost.action";
import { getVariableCostsQueryKey } from "@/hooks/queries/use-variable-costs";

export const getUpdateVariableCostMutationKey = () => ["update-variable-cost"];

export function useUpdateVariableCost(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: getUpdateVariableCostMutationKey(),
    mutationFn: updateVariableCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getVariableCostsQueryKey(organizationId) });
    },
  });
}
