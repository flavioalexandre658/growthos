import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectHotmart } from "@/actions/integrations/connect-hotmart.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectHotmartMutationKey = () => ["connect-hotmart"];

export interface ConnectHotmartVariables {
  clientId: string;
  clientSecret: string;
}

export function useConnectHotmart(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectHotmartMutationKey(),
    mutationFn: (vars: ConnectHotmartVariables) => connectHotmart(organizationId, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
