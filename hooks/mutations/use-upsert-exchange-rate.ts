import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertExchangeRate } from "@/actions/exchange-rates/upsert-exchange-rate.action";
import { getExchangeRatesQueryKey } from "@/hooks/queries/use-exchange-rates";

export function useUpsertExchangeRate(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertExchangeRate,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getExchangeRatesQueryKey(organizationId),
      });
    },
  });
}
