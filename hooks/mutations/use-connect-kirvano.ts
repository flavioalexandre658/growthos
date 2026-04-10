import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectKirvano } from "@/actions/integrations/connect-kirvano.action";
import { getIntegrationsQueryKey } from "@/hooks/queries/use-integrations";

export const getConnectKirvanoMutationKey = () => ["connect-kirvano"];

export function useConnectKirvano(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getConnectKirvanoMutationKey(),
    mutationFn: (email: string) => connectKirvano(organizationId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getIntegrationsQueryKey(organizationId),
      });
    },
  });
}
