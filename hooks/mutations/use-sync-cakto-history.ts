import { useMutation } from "@tanstack/react-query";
import { syncCaktoHistory } from "@/actions/integrations/sync-cakto-history.action";

export const getSyncCaktoHistoryMutationKey = () => ["sync-cakto-history"];

export function useSyncCaktoHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncCaktoHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncCaktoHistory(organizationId, integrationId),
  });
}
