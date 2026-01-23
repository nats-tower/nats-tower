import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      pb.authStore.clear();
    },
    onSuccess: () => {
      toast.success("Logged out successfully");
      queryClient.setQueryData(["auth-session"], null);
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      router.invalidate();
      // Redirect to login is handled by the protected route or component logic
    },
  });
}
