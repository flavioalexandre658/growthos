import { useQuery } from "@tanstack/react-query";
import { getAtRiskCustomers, getAtRiskCustomersCount } from "@/actions/customers/get-at-risk-customers.action";

export const getAtRiskCustomersQueryKey = (organizationId: string, daysThreshold?: number) => [
  "at-risk-customers",
  organizationId,
  daysThreshold ?? 30,
];

export const getAtRiskCustomersCountQueryKey = (organizationId: string, daysThreshold?: number) => [
  "at-risk-customers-count",
  organizationId,
  daysThreshold ?? 30,
];

export function useAtRiskCustomers(organizationId: string, params: { daysThreshold?: number } = {}) {
  return useQuery({
    queryKey: getAtRiskCustomersQueryKey(organizationId, params.daysThreshold),
    queryFn: () => getAtRiskCustomers(organizationId, params.daysThreshold),
    enabled: !!organizationId,
    staleTime: 60_000,
  });
}

export function useAtRiskCustomersCount(organizationId: string, params: { daysThreshold?: number } = {}) {
  return useQuery({
    queryKey: getAtRiskCustomersCountQueryKey(organizationId, params.daysThreshold),
    queryFn: () => getAtRiskCustomersCount(organizationId, params.daysThreshold),
    enabled: !!organizationId,
    staleTime: 60_000,
  });
}
