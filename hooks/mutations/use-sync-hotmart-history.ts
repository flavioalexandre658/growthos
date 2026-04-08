import { useMutation } from "@tanstack/react-query";
import { syncHotmartHistory } from "@/actions/integrations/sync-hotmart-history.action";

export const getSyncHotmartHistoryMutationKey = () => ["sync-hotmart-history"];

export function useSyncHotmartHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncHotmartHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncHotmartHistory(organizationId, integrationId),
  });
}
