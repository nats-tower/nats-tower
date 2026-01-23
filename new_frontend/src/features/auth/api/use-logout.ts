import { useMutation } from "@tanstack/react-query";
import { clearAuthData } from "../lib/auth-utils";

/**
 * Hook to handle user logout
 */
export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      clearAuthData();
    },
  });
}
