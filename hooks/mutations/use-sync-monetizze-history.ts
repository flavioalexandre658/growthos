import { useMutation } from "@tanstack/react-query";
import { syncMonetizzeHistory } from "@/actions/integrations/sync-monetizze-history.action";

export const getSyncMonetizzeHistoryMutationKey = () => ["sync-monetizze-history"];

export function useSyncMonetizzeHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncMonetizzeHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncMonetizzeHistory(organizationId, integrationId),
  });
}
