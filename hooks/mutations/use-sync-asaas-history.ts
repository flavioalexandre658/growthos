import { useMutation } from "@tanstack/react-query";
import { syncAsaasHistory } from "@/actions/integrations/sync-asaas-history.action";

export const getSyncAsaasHistoryMutationKey = () => ["sync-asaas-history"];

export function useSyncAsaasHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncAsaasHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncAsaasHistory(organizationId, integrationId),
  });
}
