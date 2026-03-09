import { useQuery } from "@tanstack/react-query";
import { getCustomers } from "@/actions/customers/get-customers.action";
import type { ICustomerListParams } from "@/interfaces/customer.interface";

export const getCustomersQueryKey = (organizationId: string, params: ICustomerListParams) => [
  "customers",
  organizationId,
  params,
];

export function useCustomers(organizationId: string, params: ICustomerListParams = {}) {
  return useQuery({
    queryKey: getCustomersQueryKey(organizationId, params),
    queryFn: () => getCustomers(organizationId, params),
    staleTime: 30_000,
  });
}
