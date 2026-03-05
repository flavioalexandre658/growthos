import { useQuery } from "@tanstack/react-query";
import { getSessionEvents } from "@/actions/events/get-session-events.action";

export const getSessionEventsQueryKey = (organizationId: string, sessionId: string) => [
  "session-events",
  organizationId,
  sessionId,
];

export function useSessionEvents(organizationId: string, sessionId: string | null) {
  return useQuery({
    queryKey: getSessionEventsQueryKey(organizationId, sessionId ?? ""),
    queryFn: () => getSessionEvents(organizationId, sessionId!),
    enabled: !!sessionId,
    staleTime: 60_000,
  });
}
