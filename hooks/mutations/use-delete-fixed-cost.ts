import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteFixedCost } from "@/actions/costs/delete-fixed-cost.action";
import { getFixedCostsQueryKey } from "@/hooks/queries/use-fixed-costs";

export const getDeleteFixedCostMutationKey = () => ["delete-fixed-cost"];

export function useDeleteFixedCost(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: getDeleteFixedCostMutationKey(),
    mutationFn: deleteFixedCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getFixedCostsQueryKey(organizationId) });
    },
  });
}
