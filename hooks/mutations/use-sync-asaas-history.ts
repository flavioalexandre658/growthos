import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncAsaasHistory } from "@/actions/integrations/sync-asaas-history.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getSyncAsaasHistoryMutationKey = () => ["sync-asaas-history"];

export function useSyncAsaasHistory(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getSyncAsaasHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncAsaasHistory(organizationId, integrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
