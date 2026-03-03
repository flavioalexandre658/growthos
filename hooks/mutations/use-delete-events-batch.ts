import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEventsBatch } from "@/actions/events/delete-events-batch.action";

export const getDeleteEventsBatchMutationKey = () => ["delete-events-batch"];

export function useDeleteEventsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getDeleteEventsBatchMutationKey(),
    mutationFn: deleteEventsBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-health"] });
    },
  });
}
