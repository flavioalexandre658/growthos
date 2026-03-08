import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTourState } from "@/actions/tour/update-tour-state.action";
import { getTourProgressQueryKey } from "@/hooks/queries/use-tour-progress";
import type { ITourState } from "@/interfaces/tour.interface";

export const getUpdateTourStateMutationKey = () => ["update-tour-state"];

export function useUpdateTourState(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getUpdateTourStateMutationKey(),
    mutationFn: (patch: Partial<ITourState>) =>
      updateTourState(organizationId!, patch),
    onSuccess: () => {
      if (organizationId) {
        queryClient.invalidateQueries({
          queryKey: getTourProgressQueryKey(organizationId),
        });
      }
    },
  });
}
