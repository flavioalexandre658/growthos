import { useQuery } from "@tanstack/react-query";
import { getOrgMembers } from "@/actions/org-members/get-org-members.action";

export const getOrgMembersQueryKey = (organizationId: string) => [
  "org-members",
  organizationId,
];

export function useOrgMembers(organizationId: string) {
  return useQuery({
    queryKey: getOrgMembersQueryKey(organizationId),
    queryFn: () => getOrgMembers({ organizationId }),
    enabled: !!organizationId,
  });
}
