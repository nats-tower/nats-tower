import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { k8sAccessQueries } from "@/lib/api/query-factories/k8s-access";
import type { NatsAuthK8sAccessResponse } from "@/lib/api/types/pocketbase-types";

/**
 * Hook to fetch K8s access for an account
 */
export function useK8sAccessForAccount(accountId: string) {
  return useQuery({
    queryKey: k8sAccessQueries.list(accountId),
    queryFn: async () => {
      return pb
        .collection<NatsAuthK8sAccessResponse>("nats_auth_k8s_access")
        .getFullList({
          filter: `account = '${accountId}'`,
        });
    },
    enabled: !!accountId,
  });
}
