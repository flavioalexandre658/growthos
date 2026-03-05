import { useQuery } from "@tanstack/react-query";
import { getActiveSubscriptions } from "@/actions/dashboard/get-active-subscriptions.action";
import type {
  SubscriptionStatusFilter,
  BillingIntervalFilter,
  NextBillingFilter,
  SubscriptionSortField,
  SortDirection,
} from "@/interfaces/mrr.interface";

interface UseActiveSubscriptionsParams {
  page?: number;
  status?: SubscriptionStatusFilter;
  planId?: string;
  billingInterval?: BillingIntervalFilter;
  nextBilling?: NextBillingFilter;
  sortField?: SubscriptionSortField;
  sortDir?: SortDirection;
}

export const getActiveSubscriptionsQueryKey = (
  organizationId: string,
  params: UseActiveSubscriptionsParams
) => ["dashboard", "active-subscriptions", organizationId, params];

export function useActiveSubscriptions(
  organizationId: string | undefined,
  params: UseActiveSubscriptionsParams = {}
) {
  return useQuery({
    queryKey: getActiveSubscriptionsQueryKey(organizationId ?? "", params),
    queryFn: () =>
      getActiveSubscriptions(organizationId!, {
        page: params.page ?? 1,
        limit: 20,
        status: params.status ?? "all",
        planId: params.planId,
        billingInterval: params.billingInterval,
        nextBilling: params.nextBilling,
        sortField: params.sortField,
        sortDir: params.sortDir,
      }),
    enabled: !!organizationId,
  });
}
