import { useMutation, useQueryClient } from "@tanstack/react-query";
import { disconnectIntegration } from "@/actions/integrations/disconnect-integration.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getDisconnectIntegrationMutationKey = () => ["disconnect-integration"];

export function useDisconnectIntegration(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getDisconnectIntegrationMutationKey(),
    mutationFn: (integrationId: string) =>
      disconnectIntegration(organizationId, integrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
