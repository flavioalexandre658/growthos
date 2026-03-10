import { useQuery } from "@tanstack/react-query";
import { getMarketingSpendSummary } from "@/actions/costs/get-marketing-spend-summary.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getMarketingSpendSummaryQueryKey = (
  organizationId: string | undefined,
  filter?: IDateFilter
) => filter !== undefined
  ? ["marketing-spend-summary", organizationId, filter]
  : ["marketing-spend-summary", organizationId];

export function useMarketingSpendSummary(
  organizationId: string | undefined,
  filter: IDateFilter = {}
) {
  return useQuery({
    queryKey: getMarketingSpendSummaryQueryKey(organizationId, filter),
    queryFn: () => getMarketingSpendSummary(organizationId!, filter),
    enabled: !!organizationId,
  });
}
