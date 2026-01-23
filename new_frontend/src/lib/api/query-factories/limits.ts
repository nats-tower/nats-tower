/**
 * Query factories for limits
 * Provides type-safe query keys for TanStack Query
 */

export const limitsQueries = {
  all: () => ["limits"] as const,
  lists: () => [...limitsQueries.all(), "list"] as const,
  list: (installationId: string) =>
    [...limitsQueries.lists(), installationId] as const,
  details: () => [...limitsQueries.all(), "detail"] as const,
  detail: (installationId: string, limitId: string) =>
    [...limitsQueries.details(), installationId, limitId] as const,
};
