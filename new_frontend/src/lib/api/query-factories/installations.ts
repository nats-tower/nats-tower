/**
 * Query factories for installations
 * Provides type-safe query keys for TanStack Query
 */

export const installationsQueries = {
  all: () => ["installations"] as const,
  lists: () => [...installationsQueries.all(), "list"] as const,
  list: () => [...installationsQueries.lists()] as const,
  details: () => [...installationsQueries.all(), "detail"] as const,
  detail: (id: string) => [...installationsQueries.details(), id] as const,
  withTeams: (id: string) => [...installationsQueries.detail(id), "teams"] as const,
  teams: (id: string) => [...installationsQueries.detail(id), "teams-only"] as const,
};
