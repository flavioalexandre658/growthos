import { useQuery } from "@tanstack/react-query";
import { getExpansionCandidates } from "@/actions/customers/get-expansion-candidates.action";

export const getExpansionCandidatesQueryKey = (
  organizationId: string,
  minLtvCents?: number,
  minTenureMonths?: number
) => ["expansion-candidates", organizationId, minLtvCents ?? 120000, minTenureMonths ?? 6];

export function useExpansionCandidates(
  organizationId: string,
  params: { minLtvCents?: number; minTenureMonths?: number } = {}
) {
  return useQuery({
    queryKey: getExpansionCandidatesQueryKey(organizationId, params.minLtvCents, params.minTenureMonths),
    queryFn: () => getExpansionCandidates(organizationId, params),
    staleTime: 60_000,
  });
}
