import { useQuery } from "@tanstack/react-query";
import { getCustomerCohorts } from "@/actions/customers/get-customer-cohorts.action";

export const getCustomerCohortsQueryKey = (organizationId: string, expandMonth?: string) => [
  "customer-cohorts",
  organizationId,
  expandMonth ?? null,
];

export function useCustomerCohorts(organizationId: string, params: { expandMonth?: string } = {}) {
  return useQuery({
    queryKey: getCustomerCohortsQueryKey(organizationId, params.expandMonth),
    queryFn: () => getCustomerCohorts(organizationId, params.expandMonth),
    staleTime: 60_000,
  });
}
