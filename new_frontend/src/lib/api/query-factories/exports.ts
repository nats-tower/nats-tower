/**
 * Query factories for exports
 * Provides type-safe query keys for TanStack Query
 */

export const exportsQueries = {
  all: () => ["exports"] as const,
  lists: () => [...exportsQueries.all(), "list"] as const,
  list: (installationId: string, accountId: string) =>
    [...exportsQueries.lists(), installationId, accountId] as const,
  available: (installationId: string, accountName: string) =>
    [...exportsQueries.all(), "available", installationId, accountName] as const,
  details: () => [...exportsQueries.all(), "detail"] as const,
  detail: (installationId: string, accountId: string, exportName: string) =>
    [...exportsQueries.details(), installationId, accountId, exportName] as const,
};
