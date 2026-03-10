import { useQuery } from "@tanstack/react-query";
import { getCustomerFunnel } from "@/actions/customers/get-customer-funnel.action";
import { useLocale } from "next-intl";

export const getCustomerFunnelQueryKey = (orgId: string, customerId: string) => [
  "customer-funnel",
  orgId,
  customerId,
];

export function useCustomerFunnel(
  orgId: string | undefined,
  customerId: string | undefined
) {
  const locale = useLocale();
  return useQuery({
    queryKey: getCustomerFunnelQueryKey(orgId ?? "", customerId ?? ""),
    queryFn: () => getCustomerFunnel(orgId!, customerId!, locale),
    enabled: !!orgId && !!customerId,
    staleTime: 60_000,
  });
}
