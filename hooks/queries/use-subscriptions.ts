import { useQuery } from "@tanstack/react-query";
import { getSubscriptions } from "@/actions/subscriptions/get-subscriptions.action";
import type { ISubscriptionParams } from "@/interfaces/subscription.interface";

export const getSubscriptionsQueryKey = (
  organizationId: string,
  params: ISubscriptionParams
) => ["subscriptions", "list", organizationId, params];

export function useSubscriptions(
  organizationId: string | undefined,
  params: ISubscriptionParams = {}
) {
  return useQuery({
    queryKey: getSubscriptionsQueryKey(organizationId ?? "", params),
    queryFn: () => getSubscriptions(organizationId!, params),
    enabled: !!organizationId,
  });
}
