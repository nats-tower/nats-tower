import { useMutation } from "@tanstack/react-query";
import { pb } from "@/lib/api/pocketbase";
import type { RecordAuthResponse } from "pocketbase";
import type { UsersResponse } from "@/lib/api/types/pocketbase-types";

/**
 * Update user profile with data from OAuth2 provider
 */
async function updateProfileFromOAuth2(authData: RecordAuthResponse<UsersResponse>) {
  const meta = authData.meta;

  if (!meta) {
    return;
  }

  const formData = new FormData();

  if (meta.avatarUrl) {
    const response = await fetch(meta.avatarUrl);

    if (response.ok) {
      const file = await response.blob();
      formData.append("avatar", file);
    }
  }

  if (meta.name) {
    formData.append("name", meta.name);
  }

  await pb.collection("users").update(authData.record.id, formData);
}

/**
 * Hook to handle OAuth login
 */
export function useOAuthLogin() {
  return useMutation({
    mutationFn: async (provider: string) => {
      const authData = await pb.collection("users").authWithOAuth2({ provider });
      await updateProfileFromOAuth2(authData);
      return authData;
    },
  });
}
