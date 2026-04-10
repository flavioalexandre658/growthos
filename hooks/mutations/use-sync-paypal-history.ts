import { useMutation } from "@tanstack/react-query";
import { syncPaypalHistory } from "@/actions/integrations/sync-paypal-history.action";

export const getSyncPaypalHistoryMutationKey = () => ["sync-paypal-history"];

export function useSyncPaypalHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncPaypalHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncPaypalHistory(organizationId, integrationId),
  });
}
