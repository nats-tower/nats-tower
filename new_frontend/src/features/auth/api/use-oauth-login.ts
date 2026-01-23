import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

interface OAuthLoginVariables {
  provider: string;
}

export function useOAuthLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ provider }: OAuthLoginVariables) => {
      // authWithOAuth2 opens a popup window for authentication
      const authData = await pb.collection("users").authWithOAuth2({ provider });

      // Automatic profile update from provider metadata
      const { meta, record } = authData;
      
      if (record && meta) {
        const updates: Record<string, unknown> = {};
        
        // Update name if missing
        if (!record.name && meta.name) {
          updates.name = meta.name;
        }

        // Update avatar if missing and available in meta
        // Note: PocketBase avatar is a file field. To update it we would need to 
        // fetch the image and upload it. This can be tricky due to CORS.
        // For now, we'll just update the name. 

        if (Object.keys(updates).length > 0) {
          try {
            await pb.collection("users").update(record.id, updates);
          } catch (updateError) {
            console.warn("Failed to update user profile from OAuth meta:", updateError);
            // Don't fail the login if profile update fails
          }
        }
      }

      return authData;
    },
    onSuccess: () => {
      toast.success("Logged in successfully");
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      router.invalidate();
    },
    onError: (error: Error) => {
      console.error("OAuth Login error:", error);
      // Global error handler in pocketbase.ts might catch this, 
      // but sometimes OAuth errors (like popup closed) are specific.
      if (error.message !== "The user closed the popup.") {
         // toast.error(`Login failed: ${error.message}`);
      }
    },
  });
}
