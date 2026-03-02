import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteApiKey } from "@/actions/api-keys/delete-api-key.action";
import { getApiKeysQueryKey } from "@/hooks/queries/use-api-keys";

export function useDeleteApiKey(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getApiKeysQueryKey(organizationId) });
    },
  });
}
