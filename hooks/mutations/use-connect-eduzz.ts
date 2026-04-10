import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectEduzz } from "@/actions/integrations/connect-eduzz.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectEduzzMutationKey = () => ["connect-eduzz"];

export interface ConnectEduzzVariables {
  publicKey: string;
  apiKey: string;
}

export function useConnectEduzz(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectEduzzMutationKey(),
    mutationFn: (vars: ConnectEduzzVariables) => connectEduzz(organizationId, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
