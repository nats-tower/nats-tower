/**
 * Query factories for imports
 * Provides type-safe query keys for TanStack Query
 */

export const importsQueries = {
  all: () => ["imports"] as const,
  lists: () => [...importsQueries.all(), "list"] as const,
  list: (installationId: string, accountId: string) =>
    [...importsQueries.lists(), installationId, accountId] as const,
  details: () => [...importsQueries.all(), "detail"] as const,
  detail: (installationId: string, accountId: string, importName: string) =>
    [...importsQueries.details(), installationId, accountId, importName] as const,
};
