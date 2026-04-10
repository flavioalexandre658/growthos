import { useMutation } from "@tanstack/react-query";
import { syncPagBankHistory } from "@/actions/integrations/sync-pagbank-history.action";

export const getSyncPagBankHistoryMutationKey = () => ["sync-pagbank-history"];

export function useSyncPagBankHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncPagBankHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncPagBankHistory(organizationId, integrationId),
  });
}
