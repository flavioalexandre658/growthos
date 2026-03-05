import { useQuery } from "@tanstack/react-query";
import { getCustomerEvents } from "@/actions/events/get-customer-events.action";

export const getCustomerEventsQueryKey = (organizationId: string, customerId: string) => [
  "customer-events",
  organizationId,
  customerId,
];

export function useCustomerEvents(organizationId: string, customerId: string | null) {
  return useQuery({
    queryKey: getCustomerEventsQueryKey(organizationId, customerId ?? ""),
    queryFn: () => getCustomerEvents(organizationId, customerId!),
    enabled: !!customerId,
    staleTime: 60_000,
  });
}
