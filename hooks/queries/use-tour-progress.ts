import { useQuery } from "@tanstack/react-query";
import { getTourProgress } from "@/actions/tour/get-tour-progress.action";
import type { ITourProgress } from "@/interfaces/tour.interface";

export const getTourProgressQueryKey = (organizationId: string) => [
  "tour-progress",
  organizationId,
];

export function useTourProgress(organizationId: string | undefined) {
  return useQuery<ITourProgress | null>({
    queryKey: getTourProgressQueryKey(organizationId ?? ""),
    queryFn: () => getTourProgress(organizationId!),
    enabled: !!organizationId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
