import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEvent } from "@/actions/events/delete-event.action";

export const getDeleteEventMutationKey = () => ["delete-event"];

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getDeleteEventMutationKey(),
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-health"] });
    },
  });
}
