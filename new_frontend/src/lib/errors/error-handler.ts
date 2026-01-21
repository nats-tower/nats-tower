import { toast } from "sonner";

/**
 * Error types
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Handle errors in a user-friendly way
 */
export function handleError(error: unknown): void {
  if (error instanceof AuthenticationError) {
    toast.error("Authentication failed. Please log in again.");
    // Redirect to login if needed
    window.location.href = "/login";
    return;
  }

  if (error instanceof NetworkError) {
    toast.error("Network error. Please check your connection.");
    return;
  }

  if (error instanceof ValidationError) {
    toast.error(error.message);
    return;
  }

  // Generic error
  console.error("Unexpected error:", error);
  
  if (import.meta.env.DEV) {
    // In development, show more details
    toast.error(
      error instanceof Error ? error.message : "An unexpected error occurred"
    );
  } else {
    // In production, show generic message
    toast.error("Something went wrong. Please try again.");
  }
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "An unexpected error occurred";
}

/**
 * Log error (console in dev, could be a service in prod)
 */
export function logError(error: unknown, context?: string): void {
  if (import.meta.env.DEV) {
    console.error(`Error${context ? ` in ${context}` : ""}:`, error);
  } else {
    // In production, you might want to send errors to a logging service
    // e.g., Sentry, LogRocket, etc.
    console.error(`Error${context ? ` in ${context}` : ""}:`, error);
  }
}
