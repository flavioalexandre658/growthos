import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getCategories } from "@/actions/dashboard/get-categories.action";
import { ICategoryParams } from "@/interfaces/dashboard.interface";

export const getCategoriesQueryKey = (params: ICategoryParams) => ["dashboard", "categories", params];

export function useCategories(params: ICategoryParams = {}) {
  return useQuery({
    queryKey: getCategoriesQueryKey(params),
    queryFn: () => getCategories(params),
    placeholderData: keepPreviousData,
  });
}
