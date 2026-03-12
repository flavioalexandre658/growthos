import { useMutation } from "@tanstack/react-query";
import { syncStripeHistory } from "@/actions/integrations/sync-stripe-history.action";

export const getSyncStripeHistoryMutationKey = () => ["sync-stripe-history"];

export function useSyncStripeHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncStripeHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncStripeHistory(organizationId, integrationId),
  });
}
