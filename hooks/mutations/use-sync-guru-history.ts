import { useMutation } from "@tanstack/react-query";
import { syncGuruHistory } from "@/actions/integrations/sync-guru-history.action";

export const getSyncGuruHistoryMutationKey = () => ["sync-guru-history"];

export function useSyncGuruHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncGuruHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncGuruHistory(organizationId, integrationId),
  });
}
