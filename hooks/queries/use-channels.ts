import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { getChannels } from "@/actions/dashboard/get-channels.action";
import type { IChannelParams } from "@/interfaces/dashboard.interface";

export const getChannelsQueryKey = (organizationId: string, params: IChannelParams, locale: string) => [
  "dashboard",
  "channels",
  organizationId,
  params,
  locale,
];

export function useChannels(organizationId: string | undefined, params: IChannelParams = {}) {
  const locale = useLocale();
  return useQuery({
    queryKey: getChannelsQueryKey(organizationId ?? "", params, locale),
    queryFn: () => getChannels(organizationId!, params, locale),
    enabled: !!organizationId,
    placeholderData: (prev) => prev,
  });
}
