import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markNotificationRead } from "@/actions/notifications/mark-notification-read.action";
import { getNotificationsQueryKey } from "@/hooks/queries/use-notifications";
import { getUnreadNotificationCountQueryKey } from "@/hooks/queries/use-unread-notification-count";

export function useMarkNotificationRead(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
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
