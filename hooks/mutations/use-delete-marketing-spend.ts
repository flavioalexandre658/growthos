import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMarketingSpend } from "@/actions/costs/delete-marketing-spend.action";
import { getMarketingSpendsQueryKey } from "@/hooks/queries/use-marketing-spends";
import { getMarketingSpendSummaryQueryKey } from "@/hooks/queries/use-marketing-spend-summary";
import { getCostsSummaryQueryKey } from "@/hooks/queries/use-costs-summary";

export function useDeleteMarketingSpend(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMarketingSpend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getMarketingSpendsQueryKey(organizationId) });
      queryClient.invalidateQueries({ queryKey: getMarketingSpendSummaryQueryKey(organizationId) });
      queryClient.invalidateQueries({ queryKey: getCostsSummaryQueryKey(organizationId) });
    },
  });
}
