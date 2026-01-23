import { redirect } from "@tanstack/react-router";
import { pb } from "@/lib/api/pocketbase";

/**
 * Helper function to check if a route requires authentication
 * Use this in beforeLoad of routes that need authentication
 */
export function requireAuth() {
  if (!pb.authStore.isValid) {
    throw redirect({
      to: "/signin",
    });
  }
}
