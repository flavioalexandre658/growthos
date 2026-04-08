import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectMercadoPago } from "@/actions/integrations/connect-mercadopago.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectMercadoPagoMutationKey = () => ["connect-mercadopago"];

export function useConnectMercadoPago(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectMercadoPagoMutationKey(),
    mutationFn: (accessToken: string) => connectMercadoPago(organizationId, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
