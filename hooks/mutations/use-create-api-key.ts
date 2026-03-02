import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createApiKey } from "@/actions/api-keys/create-api-key.action";
import { getApiKeysQueryKey } from "@/hooks/queries/use-api-keys";

export function useCreateApiKey(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getApiKeysQueryKey(organizationId) });
    },
  });
}
