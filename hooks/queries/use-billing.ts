import { useQuery } from "@tanstack/react-query";
import { getBilling } from "@/actions/billing/get-billing.action";
import type { IBillingData } from "@/actions/billing/get-billing.action";

export const getBillingQueryKey = () => ["billing"];

export function useBilling(opts?: { initialData?: IBillingData | null }) {
  return useQuery({
    queryKey: getBillingQueryKey(),
    queryFn: () => getBilling(),
    initialData: opts?.initialData ?? undefined,
  });
}
