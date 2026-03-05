import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncStripeHistory } from "@/actions/integrations/sync-stripe-history.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getSyncStripeHistoryMutationKey = () => ["sync-stripe-history"];

export function useSyncStripeHistory(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getSyncStripeHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncStripeHistory(organizationId, integrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
