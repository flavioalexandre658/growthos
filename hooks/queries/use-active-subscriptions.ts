import { useQuery } from "@tanstack/react-query";
import { getActiveSubscriptions } from "@/actions/dashboard/get-active-subscriptions.action";

export const getActiveSubscriptionsQueryKey = (organizationId: string, page: number) => [
  "dashboard",
  "active-subscriptions",
  organizationId,
  page,
];

export function useActiveSubscriptions(
  organizationId: string | undefined,
  page: number = 1
) {
  return useQuery({
    queryKey: getActiveSubscriptionsQueryKey(organizationId ?? "", page),
    queryFn: () => getActiveSubscriptions(organizationId!, { page, limit: 20 }),
    enabled: !!organizationId,
  });
}
