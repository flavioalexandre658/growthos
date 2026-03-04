import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeOrgMember } from "@/actions/org-members/remove-org-member.action";
import { getOrgMembersQueryKey } from "@/hooks/queries/use-org-members";

export const getRemoveOrgMemberMutationKey = () => ["remove-org-member"];

export function useRemoveOrgMember(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getRemoveOrgMemberMutationKey(),
    mutationFn: removeOrgMember,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getOrgMembersQueryKey(organizationId),
      });
    },
  });
}
