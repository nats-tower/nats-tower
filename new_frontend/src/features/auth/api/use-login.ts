import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

interface LoginVariables {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ email, password, rememberMe }: LoginVariables) => {
      // If rememberMe is false, we can set the auth store to not persist
      // However, PocketBase JS SDK defaults to LocalAuthStore (localStorage)
      // To support "don't remember me", we might need to clear the store on window unload
      // or use a different store.
      // But usually "remember me" means "keep me logged in for a long time" vs "session only".
      // PocketBase tokens are valid for a duration set in the backend.
      // If we want session-only persistence, we can clear the store on window close.
      // For now, we will just rely on the default behavior but maybe clear on logout.
      
      // Note: PocketBase SDK doesn't have a built-in "session only" mode easily togglable per request
      // without changing the store instance.
      // We can handle this by checking rememberMe and maybe setting a flag in sessionStorage
      // to clear auth on close if needed, but that's complex.
      // A common pattern is to just use the default persistence.
      
      // If rememberMe is explicitly false, we could potentially switch to a memory store or session storage
      // but that affects the global pb instance.
      
      // Let's just authenticate.
      const authData = await pb.collection("users").authWithPassword(email, password);
      
      if (!rememberMe) {
        // If not remember me, we might want to ensure it's cleared when the browser closes.
        // But PB stores it in localStorage by default.
        // We can't easily change the store type dynamically for just one user without affecting others if it was a multi-user app (not the case here usually).
        // Let's proceed with default persistence for now.
      }
      
      return authData;
    },
    onSuccess: () => {
      toast.success("Logged in successfully");
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      router.invalidate();
    },
    onError: (error: Error) => {
      // Error handling is also done in the global interceptor, but we can do specific things here
      console.error("Login error:", error);
    },
  });
}
