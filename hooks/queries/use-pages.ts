import { useQuery } from "@tanstack/react-query";
import { getPages } from "@/actions/dashboard/get-pages.action";
import type { ILandingPageParams } from "@/interfaces/dashboard.interface";

export const getPagesQueryKey = (
  organizationId: string,
  params: ILandingPageParams
) => ["dashboard", "pages", organizationId, params];

export function usePages(
  organizationId: string | undefined,
  params: ILandingPageParams = {}
) {
  return useQuery({
    queryKey: getPagesQueryKey(organizationId ?? "", params),
    queryFn: () => getPages(organizationId!, params),
    enabled: !!organizationId,
    placeholderData: (prev) => prev,
  });
}
