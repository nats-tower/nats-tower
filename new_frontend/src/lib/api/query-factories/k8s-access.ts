/**
 * Query factories for k8s access
 * Provides type-safe query keys for TanStack Query
 */

export const k8sAccessQueries = {
  all: () => ["k8s-access"] as const,
  lists: () => [...k8sAccessQueries.all(), "list"] as const,
  list: (accountId: string) => [...k8sAccessQueries.lists(), accountId] as const,
  details: () => [...k8sAccessQueries.all(), "detail"] as const,
  detail: (accountId: string, k8sAccessId: string) =>
    [...k8sAccessQueries.details(), accountId, k8sAccessId] as const,
};
