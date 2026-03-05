import { useQuery } from "@tanstack/react-query";
import { getIntegrations } from "@/actions/integrations/get-integrations.action";
import type { IIntegration } from "@/interfaces/integration.interface";

export const getIntegrationsQueryKey = (organizationId: string) => [
  "integrations",
  organizationId,
];

export function useIntegrations(organizationId: string) {
  return useQuery<IIntegration[]>({
    queryKey: getIntegrationsQueryKey(organizationId),
    queryFn: () => getIntegrations(organizationId),
    enabled: !!organizationId,
    refetchInterval: (query) => {
      const data = query.state.data;
      const isSyncing = data?.some(
        (i) => i.status === "active" && !i.historySyncedAt,
      );
      return isSyncing ? 5000 : false;
    },
  });
}
