import { useMutation } from "@tanstack/react-query";
import { syncKirvanoHistory } from "@/actions/integrations/sync-kirvano-history.action";

export const getSyncKirvanoHistoryMutationKey = () => ["sync-kirvano-history"];

export function useSyncKirvanoHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncKirvanoHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncKirvanoHistory(organizationId, integrationId),
  });
}
