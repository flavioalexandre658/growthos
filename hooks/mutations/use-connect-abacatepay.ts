import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectAbacatePay } from "@/actions/integrations/connect-abacatepay.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectAbacatePayMutationKey = () => ["connect-abacatepay"];

export function useConnectAbacatePay(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectAbacatePayMutationKey(),
    mutationFn: (apiKey: string) => connectAbacatePay(organizationId, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
