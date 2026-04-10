import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectPaypal } from "@/actions/integrations/connect-paypal.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectPaypalMutationKey = () => ["connect-paypal"];

export interface ConnectPaypalVariables {
  clientId: string;
  secret: string;
}

export function useConnectPaypal(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectPaypalMutationKey(),
    mutationFn: (vars: ConnectPaypalVariables) => connectPaypal(organizationId, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
