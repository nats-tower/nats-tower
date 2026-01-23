import { useMutation } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { setRememberMe } from "../lib/auth-utils";

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Hook to handle user login
 */
export function useLogin() {
  return useMutation({
    mutationFn: async ({ email, password, rememberMe = false }: LoginCredentials) => {
      const authData = await pb.collection("users").authWithPassword(email, password);
      
      // Save remember me preference
      setRememberMe(rememberMe);
      
      return authData;
    },
  });
}
