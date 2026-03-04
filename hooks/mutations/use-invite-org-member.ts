import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteOrgMember } from "@/actions/org-members/invite-org-member.action";
import { getOrgMembersQueryKey } from "@/hooks/queries/use-org-members";

export const getInviteOrgMemberMutationKey = () => ["invite-org-member"];

export function useInviteOrgMember(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getInviteOrgMemberMutationKey(),
    mutationFn: inviteOrgMember,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getOrgMembersQueryKey(organizationId),
      });
    },
  });
}
