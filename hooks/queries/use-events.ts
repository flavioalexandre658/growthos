import { useQuery } from "@tanstack/react-query";
import { getEvents } from "@/actions/events/get-events.action";
import type { IEventParams } from "@/interfaces/event.interface";

export const getEventsQueryKey = (organizationId: string, params: IEventParams) => [
  "events",
  organizationId,
  params,
];

export function useEvents(organizationId: string | undefined, params: IEventParams = {}) {
  return useQuery({
    queryKey: getEventsQueryKey(organizationId ?? "", params),
    queryFn: () => getEvents(organizationId!, params),
    enabled: !!organizationId,
    placeholderData: (prev) => prev,
  });
}
