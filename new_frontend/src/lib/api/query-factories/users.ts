/**
 * Query factories for users
 * Provides type-safe query keys for TanStack Query
 */

export const usersQueries = {
  all: () => ["users"] as const,
  lists: () => [...usersQueries.all(), "list"] as const,
  list: () => [...usersQueries.lists()] as const,
  details: () => [...usersQueries.all(), "detail"] as const,
  detail: (id: string) => [...usersQueries.details(), id] as const,
};
