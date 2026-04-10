import { useMutation } from "@tanstack/react-query";
import { syncEduzzHistory } from "@/actions/integrations/sync-eduzz-history.action";

export const getSyncEduzzHistoryMutationKey = () => ["sync-eduzz-history"];

export function useSyncEduzzHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncEduzzHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncEduzzHistory(organizationId, integrationId),
  });
}
