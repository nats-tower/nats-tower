import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { UsersResponse } from "@/lib/api/types/pocketbase-types";

export function useSession() {
  return useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      // Check if we have a token locally first
      if (!pb.authStore.isValid) {
        return null;
      }

      try {
        // Verify token with server and get fresh user data
        // This also refreshes the token if it's close to expiration
        const authData = await pb.collection("users").authRefresh();
        return authData.record as UsersResponse;
      } catch (error) {
        console.error("Session validation failed:", error);
        // If refresh fails (e.g. token expired/revoked), clear store
        pb.authStore.clear();
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: false,
  });
}
