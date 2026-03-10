import { useQuery } from "@tanstack/react-query";
import { getUnreadNotificationCount } from "@/actions/notifications/get-unread-notification-count.action";

export const getUnreadNotificationCountQueryKey = (orgId: string) => [
  "notifications-unread-count",
  orgId,
];

export function useUnreadNotificationCount(orgId: string | undefined) {
  return useQuery({
    queryKey: getUnreadNotificationCountQueryKey(orgId ?? ""),
    queryFn: () => getUnreadNotificationCount({ organizationId: orgId! }),
    enabled: !!orgId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
