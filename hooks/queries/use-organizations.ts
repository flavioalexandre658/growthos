import { useQuery } from "@tanstack/react-query";
import { getOrganizations } from "@/actions/organizations/get-organizations.action";

export const getOrganizationsQueryKey = () => ["organizations"];

export function useOrganizations() {
  return useQuery({
    queryKey: getOrganizationsQueryKey(),
    queryFn: () => getOrganizations(),
    staleTime: 5 * 60 * 1000,
  });
}
