import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFixedCost } from "@/actions/costs/create-fixed-cost.action";
import { getFixedCostsQueryKey } from "@/hooks/queries/use-fixed-costs";

export const getCreateFixedCostMutationKey = () => ["create-fixed-cost"];

export function useCreateFixedCost(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: getCreateFixedCostMutationKey(),
    mutationFn: createFixedCost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getFixedCostsQueryKey(organizationId) });
    },
  });
}
