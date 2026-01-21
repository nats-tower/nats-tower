import PocketBase from "pocketbase";
import { toast } from "sonner";
import type { TypedPocketBase } from "./types/pocketbase-types";

// During development, the PocketBase server is running on localhost:8090
// and the frontend is running on another port, so we need to specify the host
// But in production, the frontend is served by PocketBase itself, so we can use '/'
//
// 👉 Be sure to keep a trailing / in the baseUrl as its value is used to build
//    other URLs for images and links and those would break if the trailing / is missing
const baseUrl =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "/" : "http://localhost:8090/");

export const pb = new PocketBase(baseUrl) as TypedPocketBase;

interface FieldError {
  code: string;
  message: string;
}

// Error handling interceptor
// biome-ignore lint/suspicious/noExplicitAny: generic error catch
pb.afterSend = (response: Response, data: any) => {
  if (response.status !== 200 && response.status !== 204) {
    let errorMessage = `An error occurred: ${response.status}`;

    // Add the general error message if available
    if (data?.message) {
      errorMessage = `${data.message} (${response.status})`;
    }

    // Add field-specific validation errors if available
    if (data?.data && typeof data.data === "object") {
      const fieldErrors = Object.entries<FieldError>(data.data)
        .map(([field, error]: [string, FieldError]) => {
          if (error?.message) {
            return `• ${field}: ${error.message}`;
          }
          return null;
        })
        .filter(Boolean);

      if (fieldErrors.length > 0) {
        errorMessage += `\n${fieldErrors.join("\n")}`;
      }
    }

    toast.error(errorMessage);
    console.error("Error response:", response, data);
  }
  return data;
};

// Auto-refresh authentication
pb.authStore.onChange(() => {
  if (pb.authStore.isValid) {
    // Schedule token refresh before it expires
    const token = pb.authStore.token;
    if (token) {
      // Refresh 5 minutes before expiry
      const timeUntilRefresh = pb.authStore.exportToCookie().length * 1000 - 5 * 60 * 1000;
      setTimeout(() => {
        if (pb.authStore.isValid) {
          pb.collection("users").authRefresh();
        }
      }, timeUntilRefresh);
    }
  }
});
