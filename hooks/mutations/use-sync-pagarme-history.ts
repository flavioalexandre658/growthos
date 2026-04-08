import { useMutation } from "@tanstack/react-query";
import { syncPagarmeHistory } from "@/actions/integrations/sync-pagarme-history.action";

export const getSyncPagarmeHistoryMutationKey = () => ["sync-pagarme-history"];

export function useSyncPagarmeHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncPagarmeHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncPagarmeHistory(organizationId, integrationId),
  });
}
