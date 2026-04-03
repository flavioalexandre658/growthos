import { useQuery } from "@tanstack/react-query";
import { getOrgDataSources } from "@/actions/organizations/get-org-data-sources.action";
import type { OrgDataSources } from "@/actions/organizations/get-org-data-sources.action";

export const getOrgDataSourcesQueryKey = (orgId: string) => [
  "org-data-sources",
  orgId,
];

export function useOrgDataSources(organizationId: string | undefined) {
  return useQuery<OrgDataSources>({
    queryKey: getOrgDataSourcesQueryKey(organizationId ?? ""),
    queryFn: () => getOrgDataSources(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
