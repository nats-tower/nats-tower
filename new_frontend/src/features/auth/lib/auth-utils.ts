import { pb } from "@/lib/api/pocketbase";

const AUTH_STORAGE_KEY = "auth_remember";

/**
 * Check if the current session is valid
 */
export function isSessionValid(): boolean {
  return pb.authStore.isValid;
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser() {
  return pb.authStore.record;
}

/**
 * Save remember me preference
 */
export function setRememberMe(remember: boolean) {
  if (remember) {
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

/**
 * Get remember me preference
 */
export function getRememberMe(): boolean {
  return localStorage.getItem(AUTH_STORAGE_KEY) === "true";
}

/**
 * Clear all auth data
 */
export function clearAuthData() {
  pb.authStore.clear();
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
