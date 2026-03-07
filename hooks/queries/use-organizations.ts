import { useQuery } from "@tanstack/react-query";
import { getOrganizations } from "@/actions/organizations/get-organizations.action";

export const getOrganizationsQueryKey = () => ["organizations"];

export function useOrganizations(enabled = true) {
  return useQuery({
    queryKey: getOrganizationsQueryKey(),
    queryFn: () => getOrganizations(),
    enabled,
    retry: 3,
  });
}
