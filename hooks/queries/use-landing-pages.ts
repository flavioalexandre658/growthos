import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { getLandingPages } from "@/actions/dashboard/get-landing-pages.action";
import type { ILandingPageParams } from "@/interfaces/dashboard.interface";

export const getLandingPagesQueryKey = (
  organizationId: string,
  params: ILandingPageParams,
  locale: string
) => ["dashboard", "landing-pages", organizationId, params, locale];

export function useLandingPages(
  organizationId: string | undefined,
  params: ILandingPageParams = {}
) {
  const locale = useLocale();
  return useQuery({
    queryKey: getLandingPagesQueryKey(organizationId ?? "", params, locale),
    queryFn: () => getLandingPages(organizationId!, params, locale),
    enabled: !!organizationId,
    placeholderData: (prev) => prev,
  });
}
