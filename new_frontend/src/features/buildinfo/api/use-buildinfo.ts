import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { buildinfoQueries } from "@/lib/api/query-factories/buildinfo";
import type { BuildInfo } from "@/lib/api/types/expanded-pocketbase-types";

/**
 * Hook to fetch build info
 */
export function useBuildInfo() {
  return useQuery({
    queryKey: buildinfoQueries.info(),
    queryFn: async () => {
      return pb.send<BuildInfo>("/api/build_info", {
        method: "GET",
      });
    },
  });
}
