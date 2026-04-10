import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectCakto } from "@/actions/integrations/connect-cakto.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectCaktoMutationKey = () => ["connect-cakto"];

export function useConnectCakto(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectCaktoMutationKey(),
    mutationFn: (email: string) => connectCakto(organizationId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
