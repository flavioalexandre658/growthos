import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { getDaily } from "@/actions/dashboard/get-daily.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getDailyQueryKey = (organizationId: string, filter: IDateFilter, locale: string) => [
  "dashboard",
  "daily",
  organizationId,
  filter,
  locale,
];

export function useDaily(organizationId: string | undefined, filter: IDateFilter = {}) {
  const locale = useLocale();
  return useQuery({
    queryKey: getDailyQueryKey(organizationId ?? "", filter, locale),
    queryFn: () => getDaily(organizationId!, filter, locale),
    enabled: !!organizationId,
  });
}
