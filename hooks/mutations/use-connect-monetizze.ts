import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectMonetizze } from "@/actions/integrations/connect-monetizze.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectMonetizzeMutationKey = () => ["connect-monetizze"];

export function useConnectMonetizze(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectMonetizzeMutationKey(),
    mutationFn: (apiKey: string) => connectMonetizze(organizationId, apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
