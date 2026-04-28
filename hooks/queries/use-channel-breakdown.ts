import { useQuery } from "@tanstack/react-query";
import { getChannelBreakdown } from "@/actions/dashboard/get-channel-breakdown.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getChannelBreakdownQueryKey = (
  organizationId: string,
  channelKey: string,
  filter: IDateFilter,
) => ["dashboard", "channel-breakdown", organizationId, channelKey, filter];

export function useChannelBreakdown(
  organizationId: string | undefined,
  channelKey: string | null,
  filter: IDateFilter,
  enabled = true,
) {
  return useQuery({
    queryKey: getChannelBreakdownQueryKey(organizationId ?? "", channelKey ?? "", filter),
    queryFn: () =>
      getChannelBreakdown({
        organizationId: organizationId!,
        channelKey: channelKey!,
        filter,
      }),
    enabled: !!organizationId && !!channelKey && enabled,
  });
}
