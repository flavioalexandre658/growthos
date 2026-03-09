import { useQuery } from "@tanstack/react-query";
import { getCustomerSummary } from "@/actions/customers/get-customer-summary.action";

export const getCustomerSummaryQueryKey = (organizationId: string, customerId: string) => [
  "customer-summary",
  organizationId,
  customerId,
];

export function useCustomerSummary(organizationId: string, customerId: string | null) {
  return useQuery({
    queryKey: getCustomerSummaryQueryKey(organizationId, customerId ?? ""),
    queryFn: () => getCustomerSummary(organizationId, customerId!),
    enabled: !!customerId,
    staleTime: 30_000,
  });
}
