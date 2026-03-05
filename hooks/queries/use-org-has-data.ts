import { useQuery } from "@tanstack/react-query";
import { checkOrgHasData } from "@/actions/organizations/check-org-has-data.action";

export const getOrgHasDataQueryKey = (organizationId: string) => [
  "org-has-data",
  organizationId,
];

export function useOrgHasData(organizationId: string | undefined) {
  return useQuery({
    queryKey: getOrgHasDataQueryKey(organizationId ?? ""),
    queryFn: () => checkOrgHasData(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
