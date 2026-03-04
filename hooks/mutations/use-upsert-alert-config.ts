import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertAlertConfig } from "@/actions/alert-configs/upsert-alert-config.action";
import { getAlertConfigsQueryKey } from "@/hooks/queries/use-alert-configs";

export const getUpsertAlertConfigMutationKey = () => ["upsert-alert-config"];

export function useUpsertAlertConfig(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getUpsertAlertConfigMutationKey(),
    mutationFn: upsertAlertConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getAlertConfigsQueryKey(organizationId),
      });
    },
  });
}
