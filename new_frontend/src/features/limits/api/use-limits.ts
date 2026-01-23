import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { limitsQueries } from "@/lib/api/query-factories/limits";
import type { NatsAuthLimitsRecord } from "@/lib/api/types/pocketbase-types";

/**
 * Hook to fetch limits for an installation
 */
export function useInstallationLimits(installationId: string) {
  return useQuery({
    queryKey: limitsQueries.list(installationId),
    queryFn: async () => {
      return pb
        .collection<NatsAuthLimitsRecord>("nats_auth_limits")
        .getFullList({
          filter: `operator = '${installationId}'`,
        });
    },
    enabled: !!installationId,
  });
}
