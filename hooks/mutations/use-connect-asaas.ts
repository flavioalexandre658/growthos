import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectAsaas } from "@/actions/integrations/connect-asaas.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectAsaasMutationKey = () => ["connect-asaas"];

export function useConnectAsaas(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectAsaasMutationKey(),
    mutationFn: (apiKey: string) => connectAsaas(organizationId, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
