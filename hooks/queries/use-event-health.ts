import { useQuery } from "@tanstack/react-query";
import { getEventHealth } from "@/actions/events/get-event-health.action";

export const getEventHealthQueryKey = (organizationId: string) => [
  "event-health",
  organizationId,
];

export function useEventHealth(organizationId: string | undefined) {
  return useQuery({
    queryKey: getEventHealthQueryKey(organizationId ?? ""),
    queryFn: () => getEventHealth(organizationId!),
    enabled: !!organizationId,
    refetchInterval: 30000,
  });
}
