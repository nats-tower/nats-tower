/**
 * Query factories for teams
 * Provides type-safe query keys for TanStack Query
 */

export const teamsQueries = {
  all: () => ["teams"] as const,
  lists: () => [...teamsQueries.all(), "list"] as const,
  list: () => [...teamsQueries.lists()] as const,
  details: () => [...teamsQueries.all(), "detail"] as const,
  detail: (id: string) => [...teamsQueries.details(), id] as const,
};
