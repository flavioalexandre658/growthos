import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteVariableCost } from "@/actions/costs/delete-variable-cost.action";
import { getVariableCostsQueryKey } from "@/hooks/queries/use-variable-costs";

export const getDeleteVariableCostMutationKey = () => ["delete-variable-cost"];

export function useDeleteVariableCost(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: getDeleteVariableCostMutationKey(),
    mutationFn: deleteVariableCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getVariableCostsQueryKey(organizationId) });
    },
  });
}
