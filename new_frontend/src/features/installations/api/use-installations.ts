import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { installationsQueries } from "@/lib/api/query-factories/installations";
import type {
  NatsAuthOperatorsRecord,
  NatsAuthOperatorsResponse,
} from "@/lib/api/types/pocketbase-types";
import type { ExpandedNatsAuthOperatorsResponse } from "@/lib/api/types/expanded-pocketbase-types";

/**
 * Hook to fetch all installations
 */
export function useInstallations() {
  return useQuery({
    queryKey: installationsQueries.list(),
    queryFn: async () => {
      return pb
        .collection<NatsAuthOperatorsRecord>("nats_auth_operators")
        .getFullList();
    },
  });
}

/**
 * Hook to fetch a single installation by ID
 */
export function useInstallation(installationId: string) {
  return useQuery({
    queryKey: installationsQueries.detail(installationId),
    queryFn: async () => {
      return pb
        .collection<NatsAuthOperatorsResponse>("nats_auth_operators")
        .getOne(installationId);
    },
    enabled: !!installationId,
  });
}

/**
 * Hook to fetch an installation with its teams
 */
export function useInstallationWithTeams(installationId: string) {
  return useQuery({
    queryKey: installationsQueries.withTeams(installationId),
    queryFn: async () => {
      return pb
        .collection<ExpandedNatsAuthOperatorsResponse>("nats_auth_operators")
        .getOne(installationId, {
          expand: "teams",
        });
    },
    enabled: !!installationId,
  });
}

/**
 * Hook to fetch teams for an installation
 */
export function useInstallationTeams(installationId: string) {
  return useQuery({
    queryKey: installationsQueries.teams(installationId),
    queryFn: async () => {
      return pb
        .collection<ExpandedNatsAuthOperatorsResponse>("nats_auth_operators")
        .getOne(installationId, {
          expand: "teams",
        });
    },
    enabled: !!installationId,
  });
}
