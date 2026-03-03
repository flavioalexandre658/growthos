import { useQuery } from "@tanstack/react-query";
import { getActiveSubscriptions } from "@/actions/dashboard/get-active-subscriptions.action";
import type { SubscriptionStatusFilter } from "@/interfaces/mrr.interface";

export const getActiveSubscriptionsQueryKey = (
  organizationId: string,
  page: number,
  status: SubscriptionStatusFilter
) => ["dashboard", "active-subscriptions", organizationId, page, status];

export function useActiveSubscriptions(
  organizationId: string | undefined,
  page: number = 1,
  status: SubscriptionStatusFilter = "all"
) {
  return useQuery({
    queryKey: getActiveSubscriptionsQueryKey(organizationId ?? "", page, status),
    queryFn: () => getActiveSubscriptions(organizationId!, { page, limit: 20, status }),
    enabled: !!organizationId,
  });
}
