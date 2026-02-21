import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getTemplates } from "@/actions/dashboard/get-templates.action";
import { ITemplateParams } from "@/interfaces/dashboard.interface";

export const getTemplatesQueryKey = (params: ITemplateParams) => ["dashboard", "templates", params];

export function useTemplates(params: ITemplateParams = {}) {
  return useQuery({
    queryKey: getTemplatesQueryKey(params),
    queryFn: () => getTemplates(params),
    placeholderData: keepPreviousData,
  });
}
