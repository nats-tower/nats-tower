# Issue 3: Create API client layer with TanStack Query integration

## Description

Set up PocketBase client and migrate all API calls from SWR to TanStack Query, creating a type-safe API layer.

## Background

The current frontend uses a mix of SWR and TanStack Query. We need to standardize on TanStack Query for all data fetching and create reusable query/mutation patterns.

## Requirements

- Configure PocketBase client
- Replace all SWR hooks with TanStack Query
- Create query factories for type-safety
- Implement proper error handling
- Set up query devtools

## Dependencies

- Issue #1 (Project Setup) must be completed

## Tasks

### PocketBase Setup
- [ ] Install PocketBase: `bun add pocketbase`
- [ ] Create PocketBase client configuration in `src/lib/api/pocketbase.ts`
- [ ] Configure authentication handling
- [ ] Set up auto-refresh for auth tokens
- [ ] Configure base URL from environment variables

### Type Generation
- [ ] Install pocketbase-typegen: `bun add -d pocketbase-typegen`
- [ ] Configure type generation script
- [ ] Generate TypeScript types from PocketBase schema
- [ ] Create extended/expanded response types
- [ ] Add script to regenerate types: `bun run pb:typegen`

### TanStack Query Configuration
- [ ] Configure QueryClient with sensible defaults:
  - Default stale time
  - Default cache time
  - Retry logic
  - Refetch on window focus
- [ ] Create query client instance
- [ ] Set up global error handling
- [ ] Configure mutation defaults

### Query Factories
Create query factories in `src/lib/api/query-factories/`:
- [ ] installations.ts - Installation queries
- [ ] accounts.ts - Account queries
- [ ] users.ts - User queries
- [ ] teams.ts - Team queries
- [ ] limits.ts - Limits queries
- [ ] k8s-access.ts - K8s access queries
- [ ] imports.ts - Imports queries
- [ ] exports.ts - Exports queries
- [ ] buildinfo.ts - Build info queries

Query factory pattern:
```typescript
export const installationsQueries = {
  all: () => ['installations'] as const,
  lists: () => [...installationsQueries.all(), 'list'] as const,
  list: () => [...installationsQueries.lists()] as const,
  details: () => [...installationsQueries.all(), 'detail'] as const,
  detail: (id: string) => [...installationsQueries.details(), id] as const,
};
```

### Migration from SWR
Migrate each service file:
- [ ] installations.tsx → installations-queries.ts
- [ ] accounts.tsx → accounts-queries.ts
- [ ] users.tsx → users-queries.ts
- [ ] teams.tsx → teams-queries.ts
- [ ] limits.tsx → limits-queries.ts
- [ ] k8s-access.tsx → k8s-access-queries.ts
- [ ] imports.tsx → imports-queries.ts
- [ ] exports.tsx → exports-queries.ts
- [ ] buildinfo.tsx → buildinfo-queries.ts

### Create Custom Hooks
Create hooks in `src/features/*/api/`:
```typescript
// Example: useInstallations
export function useInstallations() {
  return useQuery({
    queryKey: installationsQueries.list(),
    queryFn: async () => {
      return pb.collection('nats_auth_operators').getFullList();
    },
  });
}
```

### Mutation Utilities
Create mutation hooks for:
- [ ] Create operations
- [ ] Update operations
- [ ] Delete operations
- [ ] Batch operations

Include:
- Optimistic updates
- Cache invalidation
- Error handling
- Success toasts

### Error Handling
- [ ] Create error boundary components
- [ ] Create error handling utilities
- [ ] Implement user-friendly error messages
- [ ] Add error logging (console in dev, service in prod)
- [ ] Handle network errors gracefully
- [ ] Handle authentication errors (redirect to login)

### Query Devtools
- [ ] Configure React Query Devtools
- [ ] Only show in development
- [ ] Position appropriately in UI
- [ ] Add toggle button

### Authentication Integration
- [ ] Create auth queries (login, logout, session)
- [ ] Implement auth state management
- [ ] Handle token refresh
- [ ] Implement protected query pattern
- [ ] Add auth error interceptors

## File Structure

```
src/
├── lib/
│   ├── api/
│   │   ├── pocketbase.ts
│   │   ├── query-client.ts
│   │   ├── query-factories/
│   │   │   ├── installations.ts
│   │   │   ├── accounts.ts
│   │   │   ├── users.ts
│   │   │   └── ...
│   │   └── types/
│   │       ├── pocketbase-types.ts (generated)
│   │       └── expanded-pocketbase-types.ts
│   └── errors/
│       ├── error-handler.ts
│       └── error-boundary.tsx
└── features/
    └── <feature>/
        └── api/
            ├── use-<feature>.ts
            ├── use-create-<feature>.ts
            ├── use-update-<feature>.ts
            └── use-delete-<feature>.ts
```

## Example Implementation

```typescript
// src/lib/api/query-factories/installations.ts
export const installationsQueries = {
  all: () => ['installations'] as const,
  lists: () => [...installationsQueries.all(), 'list'] as const,
  list: () => [...installationsQueries.lists()] as const,
  details: () => [...installationsQueries.all(), 'detail'] as const,
  detail: (id: string) => [...installationsQueries.details(), id] as const,
  withTeams: (id: string) => [...installationsQueries.detail(id), 'teams'] as const,
};

// src/features/installations/api/use-installations.ts
export function useInstallations() {
  return useQuery({
    queryKey: installationsQueries.list(),
    queryFn: async () => {
      return pb.collection('nats_auth_operators').getFullList();
    },
  });
}

// src/features/installations/api/use-installation.ts
export function useInstallation(id: string) {
  return useQuery({
    queryKey: installationsQueries.detail(id),
    queryFn: async () => {
      return pb.collection('nats_auth_operators').getOne(id);
    },
    enabled: !!id,
  });
}
```

## Acceptance Criteria

- [ ] PocketBase client is configured and working
- [ ] All SWR hooks are replaced with TanStack Query
- [ ] Type-safe query keys using query factories
- [ ] All queries return properly typed data
- [ ] Mutations invalidate appropriate queries
- [ ] Error handling works consistently
- [ ] Loading states work correctly
- [ ] React Query Devtools are accessible
- [ ] Auth token refresh works automatically
- [ ] Protected queries redirect to login when unauthenticated
- [ ] Optimistic updates work for mutations
- [ ] Cache invalidation works correctly

## Testing

- [ ] Test query data fetching
- [ ] Test mutations (create, update, delete)
- [ ] Test cache invalidation
- [ ] Test optimistic updates
- [ ] Test error scenarios
- [ ] Test loading states
- [ ] Test authentication flows
- [ ] Test query refetching

## Migration Reference

Reference current services in:
- `frontend/src/services/*.tsx`

Each service file should map to query factories and custom hooks.

## Notes

- Use query factories for type-safe query keys
- Always handle loading and error states
- Implement optimistic updates where appropriate
- Use proper TypeScript types from PocketBase
- Keep query logic separate from components
- Use suspense for code splitting (optional)
- Consider using prefetching for better UX

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [PocketBase SDK](https://pocketbase.io/docs/)
- [Query Key Factories](https://tkdodo.eu/blog/effective-react-query-keys)
- [Error Handling](https://tkdodo.eu/blog/react-query-error-handling)
