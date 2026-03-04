import { useQuery } from "@tanstack/react-query";
import { getExchangeRates } from "@/actions/exchange-rates/get-exchange-rates.action";

export const getExchangeRatesQueryKey = (organizationId: string) => [
  "exchange-rates",
  organizationId,
];

export function useExchangeRates(organizationId: string) {
  return useQuery({
    queryKey: getExchangeRatesQueryKey(organizationId),
    queryFn: () => getExchangeRates({ organizationId }),
    enabled: !!organizationId,
  });
}
