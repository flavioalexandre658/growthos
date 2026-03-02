import { useQuery } from "@tanstack/react-query";
import { getApiKeys } from "@/actions/api-keys/get-api-keys.action";

export const getApiKeysQueryKey = (organizationId: string) => [
  "api-keys",
  organizationId,
];

export function useApiKeys(organizationId: string | undefined) {
  return useQuery({
    queryKey: getApiKeysQueryKey(organizationId ?? ""),
    queryFn: () => getApiKeys(organizationId!),
    enabled: !!organizationId,
  });
}
