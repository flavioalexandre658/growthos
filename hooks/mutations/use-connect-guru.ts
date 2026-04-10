import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectGuru } from "@/actions/integrations/connect-guru.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectGuruMutationKey = () => ["connect-guru"];

export function useConnectGuru(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectGuruMutationKey(),
    mutationFn: (userToken: string) => connectGuru(organizationId, userToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
