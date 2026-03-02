import { useQuery } from "@tanstack/react-query";
import { getLandingPages } from "@/actions/dashboard/get-landing-pages.action";
import type { ILandingPageParams } from "@/interfaces/dashboard.interface";

export const getLandingPagesQueryKey = (
  organizationId: string,
  params: ILandingPageParams
) => ["dashboard", "landing-pages", organizationId, params];

export function useLandingPages(
  organizationId: string | undefined,
  params: ILandingPageParams = {}
) {
  return useQuery({
    queryKey: getLandingPagesQueryKey(organizationId ?? "", params),
    queryFn: () => getLandingPages(organizationId!, params),
    enabled: !!organizationId,
    placeholderData: (prev) => prev,
  });
}
