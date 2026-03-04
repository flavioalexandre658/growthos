import { useQuery } from "@tanstack/react-query";
import { getAlertConfigs } from "@/actions/alert-configs/get-alert-configs.action";

export const getAlertConfigsQueryKey = (organizationId: string) => [
  "alert-configs",
  organizationId,
];

export function useAlertConfigs(organizationId: string) {
  return useQuery({
    queryKey: getAlertConfigsQueryKey(organizationId),
    queryFn: () => getAlertConfigs({ organizationId }),
    enabled: !!organizationId,
  });
}
