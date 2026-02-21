import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getLandingPages } from "@/actions/dashboard/get-landing-pages.action";
import { ILandingPageParams } from "@/interfaces/dashboard.interface";

export const getLandingPagesQueryKey = (params: ILandingPageParams) => ["dashboard", "landing-pages", params];

export function useLandingPages(params: ILandingPageParams = {}) {
  return useQuery({
    queryKey: getLandingPagesQueryKey(params),
    queryFn: () => getLandingPages(params),
    placeholderData: keepPreviousData,
  });
}
