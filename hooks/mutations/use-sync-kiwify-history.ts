import { useMutation } from "@tanstack/react-query";
import { syncKiwifyHistory } from "@/actions/integrations/sync-kiwify-history.action";

export const getSyncKiwifyHistoryMutationKey = () => ["sync-kiwify-history"];

export function useSyncKiwifyHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncKiwifyHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncKiwifyHistory(organizationId, integrationId),
  });
}
