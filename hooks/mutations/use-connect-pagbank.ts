import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectPagBank } from "@/actions/integrations/connect-pagbank.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectPagBankMutationKey = () => ["connect-pagbank"];

export function useConnectPagBank(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectPagBankMutationKey(),
    mutationFn: (token: string) => connectPagBank(organizationId, token),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
