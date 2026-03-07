import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { getSourceDistribution } from "@/actions/dashboard/get-source-distribution.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getSourceDistributionQueryKey = (
  organizationId: string,
  filter: IDateFilter,
  locale: string
) => ["dashboard", "source-distribution", organizationId, filter, locale];

export function useSourceDistribution(
  organizationId: string | undefined,
  filter: IDateFilter = {}
) {
  const locale = useLocale();
  return useQuery({
    queryKey: getSourceDistributionQueryKey(organizationId ?? "", filter, locale),
    queryFn: () => getSourceDistribution(organizationId!, filter, locale),
    enabled: !!organizationId,
  });
}
