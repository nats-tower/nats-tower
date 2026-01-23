# API Client Layer

This directory contains the API client layer for the NATS Tower frontend application using TanStack Query and PocketBase.

## Structure

```
src/lib/api/
├── pocketbase.ts           # PocketBase client configuration
├── query-client.ts         # TanStack Query client configuration
├── query-factories/        # Type-safe query key factories
│   ├── installations.ts
│   ├── accounts.ts
│   ├── users.ts
│   ├── teams.ts
│   ├── limits.ts
│   ├── k8s-access.ts
│   ├── imports.ts
│   ├── exports.ts
│   ├── buildinfo.ts
│   └── index.ts
└── types/                  # TypeScript types
    ├── pocketbase-types.ts          # Auto-generated PocketBase types
    └── expanded-pocketbase-types.ts # Custom expanded types
```

## Features

- **PocketBase Integration**: Configured PocketBase client with automatic error handling
- **TanStack Query**: All data fetching uses TanStack Query for consistent caching and state management
- **Type Safety**: Full TypeScript support with auto-generated and custom types
- **Query Factories**: Type-safe query keys using factory pattern
- **Error Handling**: Centralized error handling with user-friendly messages
- **Auto-refresh**: Automatic token refresh for authentication

## Usage

### Importing Hooks

```typescript
// Import specific hooks
import { useInstallations, useInstallation } from "@/features";

// Or import from specific feature
import { useInstallations } from "@/features/installations/api/use-installations";
```

### Using Query Hooks

```typescript
function MyComponent() {
  const { data, isLoading, error } = useInstallations();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.map((installation) => (
        <div key={installation.id}>{installation.name}</div>
      ))}
    </div>
  );
}
```

### Using Mutation Hooks

```typescript
function MyComponent() {
  const { mutate, isPending } = useUpsertAccountImport(installationId, accountId);

  const handleSubmit = (data) => {
    mutate(data, {
      onSuccess: () => {
        console.log("Import saved!");
      },
    });
  };

  return (
    <button onClick={() => handleSubmit(data)} disabled={isPending}>
      Save Import
    </button>
  );
}
```

### Query Factories

Query factories provide type-safe query keys:

```typescript
import { installationsQueries } from "@/lib/api/query-factories";

// Use in custom hooks
const queryKey = installationsQueries.detail(id);

// Manually invalidate queries
queryClient.invalidateQueries({ queryKey: installationsQueries.all() });
```

## Type Generation

To regenerate PocketBase types from the schema:

```bash
npm run pb:typegen
```

This will connect to your local PocketBase instance and generate TypeScript types.

## Environment Variables

- `VITE_API_BASE_URL`: Base URL for the PocketBase API (default: http://localhost:8090 in dev, / in production)

## Error Handling

Errors are automatically handled by the PocketBase client and displayed to users via toast notifications. Additional error handling utilities are available in `src/lib/errors/`.

## Query Client Configuration

The query client is configured with sensible defaults:

- **Stale Time**: 5 minutes
- **Retry**: 1 attempt
- **Refetch on Window Focus**: Disabled

These can be overridden per-query as needed.
