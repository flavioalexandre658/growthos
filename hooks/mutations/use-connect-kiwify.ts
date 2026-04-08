import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectKiwify } from "@/actions/integrations/connect-kiwify.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectKiwifyMutationKey = () => ["connect-kiwify"];

export interface ConnectKiwifyVariables {
  clientId: string;
  clientSecret: string;
  accountId: string;
}

export function useConnectKiwify(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectKiwifyMutationKey(),
    mutationFn: (vars: ConnectKiwifyVariables) => connectKiwify(organizationId, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
