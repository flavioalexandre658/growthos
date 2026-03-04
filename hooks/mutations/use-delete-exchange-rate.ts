import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteExchangeRate } from "@/actions/exchange-rates/delete-exchange-rate.action";
import { getExchangeRatesQueryKey } from "@/hooks/queries/use-exchange-rates";

export function useDeleteExchangeRate(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteExchangeRate,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getExchangeRatesQueryKey(organizationId),
      });
    },
  });
}
