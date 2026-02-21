import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getChannels } from "@/actions/dashboard/get-channels.action";
import { IChannelParams } from "@/interfaces/dashboard.interface";

export const getChannelsQueryKey = (params: IChannelParams) => ["dashboard", "channels", params];

export function useChannels(params: IChannelParams = {}) {
  return useQuery({
    queryKey: getChannelsQueryKey(params),
    queryFn: () => getChannels(params),
    placeholderData: keepPreviousData,
  });
}
