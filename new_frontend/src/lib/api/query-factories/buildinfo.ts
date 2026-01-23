/**
 * Query factories for build info
 * Provides type-safe query keys for TanStack Query
 */

export const buildinfoQueries = {
  all: () => ["buildinfo"] as const,
  info: () => [...buildinfoQueries.all(), "info"] as const,
};
