/**
 * Query factories for accounts
 * Provides type-safe query keys for TanStack Query
 */

export const accountsQueries = {
  all: () => ["accounts"] as const,
  lists: () => [...accountsQueries.all(), "list"] as const,
  list: (installationId: string) =>
    [...accountsQueries.lists(), installationId] as const,
  listWithTeams: (installationId: string) =>
    [...accountsQueries.lists(), installationId, "teams"] as const,
  details: () => [...accountsQueries.all(), "detail"] as const,
  detail: (installationId: string, accountId: string) =>
    [...accountsQueries.details(), installationId, accountId] as const,
  detailWithTeams: (installationId: string, accountId: string) =>
    [...accountsQueries.details(), installationId, accountId, "teams"] as const,
  pendingActions: (installationId: string) =>
    [...accountsQueries.all(), "pending", installationId] as const,
};
