import { useQuery } from "@tanstack/react-query";
import { getMrrMovement } from "@/actions/dashboard/get-mrr-movement.action";
import type { IDateFilter } from "@/interfaces/dashboard.interface";

export const getMrrMovementQueryKey = (organizationId: string, filter: IDateFilter) => [
  "dashboard",
  "mrr-movement",
  organizationId,
  filter,
];

export function useMrrMovement(organizationId: string | undefined, filter: IDateFilter = {}) {
  return useQuery({
    queryKey: getMrrMovementQueryKey(organizationId ?? "", filter),
    queryFn: () => getMrrMovement(organizationId!, filter),
    enabled: !!organizationId,
  });
}
