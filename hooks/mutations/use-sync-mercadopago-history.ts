import { useMutation } from "@tanstack/react-query";
import { syncMercadoPagoHistory } from "@/actions/integrations/sync-mercadopago-history.action";

export const getSyncMercadoPagoHistoryMutationKey = () => ["sync-mercadopago-history"];

export function useSyncMercadoPagoHistory(organizationId: string) {
  return useMutation({
    mutationKey: getSyncMercadoPagoHistoryMutationKey(),
    mutationFn: (integrationId: string) =>
      syncMercadoPagoHistory(organizationId, integrationId),
  });
}
