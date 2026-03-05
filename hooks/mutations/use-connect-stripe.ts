import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectStripe } from "@/actions/integrations/connect-stripe.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectStripeMutationKey = () => ["connect-stripe"];

export function useConnectStripe(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectStripeMutationKey(),
    mutationFn: (rawKey: string) => connectStripe(organizationId, rawKey),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
