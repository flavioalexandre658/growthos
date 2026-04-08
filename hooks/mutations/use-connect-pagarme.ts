import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectPagarme } from "@/actions/integrations/connect-pagarme.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectPagarmeMutationKey = () => ["connect-pagarme"];

export function useConnectPagarme(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectPagarmeMutationKey(),
    mutationFn: (secretKey: string) => connectPagarme(organizationId, secretKey),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
