/**
 * Query factories for authentication
 * Provides type-safe query keys for TanStack Query
 */

export const authQueries = {
  all: () => ["auth"] as const,
  session: () => [...authQueries.all(), "session"] as const,
};
