import { useMutation } from "@tanstack/react-query";
import { syncAbacatePayHistory } from "@/actions/integrations/sync-abacatepay-history.action";

export const getSyncAbacatePayHistoryMutationKey = () => ["sync-abacatepay-history"];

export function useSyncAbacatePayHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncAbacatePayHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncAbacatePayHistory(organizationId, integrationId),
  });
}
