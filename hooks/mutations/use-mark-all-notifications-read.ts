import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAllNotificationsRead } from "@/actions/notifications/mark-all-notifications-read.action";
import { getNotificationsQueryKey } from "@/hooks/queries/use-notifications";
import { getUnreadNotificationCountQueryKey } from "@/hooks/queries/use-unread-notification-count";

export function useMarkAllNotificationsRead(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getNotificationsQueryKey(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: getUnreadNotificationCountQueryKey(orgId),
      });
    },
  });
}
