import { useQuery } from "@tanstack/react-query";
import { getChannels } from "@/actions/dashboard/get-channels.action";
import type { IChannelParams } from "@/interfaces/dashboard.interface";

export const getChannelsQueryKey = (organizationId: string, params: IChannelParams) => [
  "dashboard",
  "channels",
  organizationId,
  params,
];

export function useChannels(organizationId: string | undefined, params: IChannelParams = {}) {
  return useQuery({
    queryKey: getChannelsQueryKey(organizationId ?? "", params),
    queryFn: () => getChannels(organizationId!, params),
    enabled: !!organizationId,
    placeholderData: (prev) => prev,
  });
}
