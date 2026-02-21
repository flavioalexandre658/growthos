import { useQuery } from "@tanstack/react-query";
import { getTemplates } from "@/actions/dashboard/get-templates.action";
import { DashboardPeriod } from "@/interfaces/dashboard.interface";

export const getTemplatesQueryKey = (period: DashboardPeriod) => ["dashboard", "templates", period];

export function useTemplates(period: DashboardPeriod = "30d") {
  return useQuery({
    queryKey: getTemplatesQueryKey(period),
    queryFn: () => getTemplates(period),
  });
}
