import { useQuery } from "@tanstack/react-query";
import { getTopCustomers, type TopCustomerSortBy } from "@/actions/customers/get-top-customers.action";

export const getTopCustomersQueryKey = (
  organizationId: string,
  limit?: number,
  sortBy?: TopCustomerSortBy
) => ["top-customers", organizationId, limit ?? 50, sortBy ?? "ltv"];

export function useTopCustomers(
  organizationId: string,
  params: { limit?: number; sortBy?: TopCustomerSortBy } = {}
) {
  return useQuery({
    queryKey: getTopCustomersQueryKey(organizationId, params.limit, params.sortBy),
    queryFn: () => getTopCustomers(organizationId, params),
    enabled: !!organizationId,
    staleTime: 60_000,
  });
}
