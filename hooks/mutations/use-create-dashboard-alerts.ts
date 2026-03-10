import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDashboardAlerts } from "@/actions/notifications/create-dashboard-alerts.action";
import { getNotificationsQueryKey } from "@/hooks/queries/use-notifications";
import { getUnreadNotificationCountQueryKey } from "@/hooks/queries/use-unread-notification-count";

export function useCreateDashboardAlerts(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDashboardAlerts,
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
