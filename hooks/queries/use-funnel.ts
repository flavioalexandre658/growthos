import { useQuery } from "@tanstack/react-query";
import { getFunnel } from "@/actions/dashboard/get-funnel.action";
import { IDateFilter } from "@/interfaces/dashboard.interface";

export const getFunnelQueryKey = (filter: IDateFilter) => ["dashboard", "funnel", filter];

export function useFunnel(filter: IDateFilter = {}) {
  return useQuery({
    queryKey: getFunnelQueryKey(filter),
    queryFn: () => getFunnel(filter),
  });
}
