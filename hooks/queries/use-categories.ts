import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/actions/dashboard/get-categories.action";
import { DashboardPeriod } from "@/interfaces/dashboard.interface";

export const getCategoriesQueryKey = (period: DashboardPeriod) => ["dashboard", "categories", period];

export function useCategories(period: DashboardPeriod = "30d") {
  return useQuery({
    queryKey: getCategoriesQueryKey(period),
    queryFn: () => getCategories(period),
  });
}
