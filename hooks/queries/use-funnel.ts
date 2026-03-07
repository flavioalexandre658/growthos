import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { getFunnel } from "@/actions/dashboard/get-funnel.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getFunnelQueryKey = (organizationId: string, filter: IDateFilter, locale: string) => [
  "dashboard",
  "funnel",
  organizationId,
  filter,
  locale,
];

export function useFunnel(organizationId: string | undefined, filter: IDateFilter = {}) {
  const locale = useLocale();
  return useQuery({
    queryKey: getFunnelQueryKey(organizationId ?? "", filter, locale),
    queryFn: () => getFunnel(organizationId!, filter, locale),
    enabled: !!organizationId,
  });
}
