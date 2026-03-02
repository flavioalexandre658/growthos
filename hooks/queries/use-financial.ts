import { useQuery } from "@tanstack/react-query";
import { getFinancial } from "@/actions/dashboard/get-financial.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getFinancialQueryKey = (organizationId: string, filter: IDateFilter) => [
  "dashboard",
  "financial",
  organizationId,
  filter,
];

export function useFinancial(organizationId: string | undefined, filter: IDateFilter = {}) {
  return useQuery({
    queryKey: getFinancialQueryKey(organizationId ?? "", filter),
    queryFn: () => getFinancial(organizationId!, filter),
    enabled: !!organizationId,
  });
}
