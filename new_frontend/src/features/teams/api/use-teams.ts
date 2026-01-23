import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { teamsQueries } from "@/lib/api/query-factories/teams";
import type { TeamsRecord } from "@/lib/api/types/pocketbase-types";

/**
 * Hook to fetch all teams
 */
export function useTeams() {
  return useQuery({
    queryKey: teamsQueries.list(),
    queryFn: async () => {
      return pb.collection<TeamsRecord>("teams").getFullList();
    },
  });
}

/**
 * Hook to fetch a single team by ID
 */
export function useTeam(teamId: string) {
  return useQuery({
    queryKey: teamsQueries.detail(teamId),
    queryFn: async () => {
      return pb.collection<TeamsRecord>("teams").getOne(teamId);
    },
    enabled: !!teamId,
  });
}
