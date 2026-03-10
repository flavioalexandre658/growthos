import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/actions/notifications/get-notifications.action";
import type { NotificationRow } from "@/actions/notifications/get-notifications.action";

export type { NotificationRow };

export const getNotificationsQueryKey = (orgId: string) => [
  "notifications",
  orgId,
];

export function useNotifications(orgId: string | undefined) {
  return useQuery({
    queryKey: getNotificationsQueryKey(orgId ?? ""),
    queryFn: () =>
      getNotifications({ organizationId: orgId!, limit: 30, onlyUnread: false }),
    enabled: !!orgId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
