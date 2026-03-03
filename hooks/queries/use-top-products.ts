import { useQuery } from "@tanstack/react-query";
import { getTopProducts } from "@/actions/dashboard/get-top-products.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getTopProductsQueryKey = (
  organizationId: string,
  filter: IDateFilter
) => ["dashboard", "top-products", organizationId, filter];

export function useTopProducts(
  organizationId: string | undefined,
  filter: IDateFilter = {}
) {
  return useQuery({
    queryKey: getTopProductsQueryKey(organizationId ?? "", filter),
    queryFn: () => getTopProducts(organizationId!, filter),
    enabled: !!organizationId,
  });
}
