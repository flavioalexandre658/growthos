import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getTemplatesOpportunities } from "@/actions/dashboard/get-templates-opportunities.action";
import { IOpportunityParams } from "@/interfaces/dashboard.interface";

export const getTemplatesOpportunitiesQueryKey = (params: IOpportunityParams) => [
  "dashboard",
  "templates-opportunities",
  params,
];

export function useTemplatesOpportunities(params: IOpportunityParams = {}) {
  return useQuery({
    queryKey: getTemplatesOpportunitiesQueryKey(params),
    queryFn: () => getTemplatesOpportunities(params),
    placeholderData: keepPreviousData,
  });
}
