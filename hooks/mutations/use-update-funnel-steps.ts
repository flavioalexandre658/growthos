import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateFunnelSteps } from "@/actions/organizations/update-funnel-steps.action";
import { getOrganizationsQueryKey } from "@/hooks/queries/use-organizations";

export const getUpdateFunnelStepsMutationKey = () => ["update-funnel-steps"];

export function useUpdateFunnelSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getUpdateFunnelStepsMutationKey(),
    mutationFn: updateFunnelSteps,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getOrganizationsQueryKey() });
    },
  });
}
