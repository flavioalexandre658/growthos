import { useQuery } from "@tanstack/react-query";
import { getMarketingSpends, type IGetMarketingSpendsParams } from "@/actions/costs/get-marketing-spends.action";

export const getMarketingSpendsQueryKey = (
  organizationId: string | undefined,
  params?: IGetMarketingSpendsParams
) => params !== undefined
  ? ["marketing-spends", organizationId, params]
  : ["marketing-spends", organizationId];

export function useMarketingSpends(
  organizationId: string | undefined,
  params: IGetMarketingSpendsParams = {}
) {
  return useQuery({
    queryKey: getMarketingSpendsQueryKey(organizationId, params),
    queryFn: () => getMarketingSpends(organizationId!, params),
    enabled: !!organizationId,
  });
}
