import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { authQueries } from "@/lib/api/query-factories/auth";

/**
 * Hook to check and maintain the current session
 */
export function useSession() {
  return useQuery({
    queryKey: authQueries.session(),
    queryFn: async () => {
      // Check if we have a valid token
      if (!pb.authStore.isValid) {
        return null;
      }

      try {
        // Refresh the auth store to ensure the token is still valid
        // This will throw an error if the token has expired
        await pb.collection("users").authRefresh();
        return pb.authStore.record;
      } catch {
        // Token is invalid or expired
        pb.authStore.clear();
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when reconnecting
    retry: false, // Don't retry on failure (invalid sessions should not retry)
  });
}
