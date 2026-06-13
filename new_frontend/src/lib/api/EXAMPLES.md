# API Client Layer Examples

This document provides examples of how to use the API client layer with TanStack Query.

## Basic Query Usage

### Fetching a List

```typescript
import { useInstallations } from "@/features";

function InstallationsList() {
  const { data: installations, isLoading, error } = useInstallations();

  if (isLoading) {
    return <div>Loading installations...</div>;
  }

  if (error) {
    return <div>Error loading installations: {error.message}</div>;
  }

  return (
    <ul>
      {installations?.map((installation) => (
        <li key={installation.id}>{installation.name}</li>
      ))}
    </ul>
  );
}
```

### Fetching a Single Item

```typescript
import { useInstallation } from "@/features";

function InstallationDetail({ id }: { id: string }) {
  const { data: installation, isLoading } = useInstallation(id);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{installation?.name}</h1>
      <p>{installation?.description}</p>
    </div>
  );
}
```

### Fetching with Expanded Relations

```typescript
import { useAccountWithTeams } from "@/features";

function AccountDetail({ installationId, accountId }: Props) {
  const { data: account } = useAccountWithTeams(installationId, accountId);

  return (
    <div>
      <h1>{account?.name}</h1>
      <h2>Teams</h2>
      <ul>
        {account?.expand?.teams?.map((team) => (
          <li key={team.id}>{team.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Mutation Usage

### Creating/Updating Data

```typescript
import { useUpsertAccountImport } from "@/features";

function ImportForm({ installationId, accountId }: Props) {
  const { mutate, isPending } = useUpsertAccountImport(installationId, accountId);

  const handleSubmit = (formData: AccountImport) => {
    mutate(formData, {
      onSuccess: () => {
        console.log("Import saved successfully!");
      },
      onError: (error) => {
        console.error("Failed to save import:", error);
      },
    });
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(/* form data */);
    }}>
      {/* form fields */}
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

### Deleting Data

```typescript
import { useDeleteAccountExport } from "@/features";

function ExportItem({ installationId, accountId, exportName }: Props) {
  const { mutate: deleteExport, isPending } = useDeleteAccountExport(
    installationId,
    accountId
  );

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this export?")) {
      deleteExport(exportName);
    }
  };

  return (
    <div>
      <span>{exportName}</span>
      <button onClick={handleDelete} disabled={isPending}>
        {isPending ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
```

## Advanced Usage

### Dependent Queries

```typescript
import { useInstallation, useAccountsWithTeams } from "@/features";

function InstallationAccounts({ id }: { id: string }) {
  // First query
  const { data: installation } = useInstallation(id);

  // Second query depends on first
  const { data: accounts } = useAccountsWithTeams(id);

  return (
    <div>
      <h1>{installation?.name}</h1>
      <h2>Accounts</h2>
      {accounts?.map((account) => (
        <div key={account.id}>{account.name}</div>
      ))}
    </div>
  );
}
```

### Optimistic Updates

```typescript
import { useUpsertAccountExport } from "@/features";
import { useQueryClient } from "@tanstack/react-query";
import { exportsQueries } from "@/lib/api/query-factories";

function ExportForm({ installationId, accountId }: Props) {
  const queryClient = useQueryClient();
  const { mutate } = useUpsertAccountExport(installationId, accountId);

  const handleSubmit = (newExport: AccountExport) => {
    mutate(newExport, {
      // Optimistically update the cache before the mutation completes
      onMutate: async (newData) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({
          queryKey: exportsQueries.list(installationId, accountId),
        });

        // Snapshot the previous value
        const previousExports = queryClient.getQueryData(
          exportsQueries.list(installationId, accountId)
        );

        // Optimistically update to the new value
        queryClient.setQueryData(
          exportsQueries.list(installationId, accountId),
          (old: any) => [...(old || []), newData]
        );

        // Return a context object with the snapshotted value
        return { previousExports };
      },
      // If the mutation fails, rollback
      onError: (err, newData, context) => {
        queryClient.setQueryData(
          exportsQueries.list(installationId, accountId),
          context?.previousExports
        );
      },
      // Always refetch after error or success
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: exportsQueries.list(installationId, accountId),
        });
      },
    });
  };

  return <form onSubmit={(e) => { e.preventDefault(); handleSubmit(/* data */); }}>
    {/* form fields */}
  </form>;
}
```

### Manual Cache Invalidation

```typescript
import { useQueryClient } from "@tanstack/react-query";
import { installationsQueries } from "@/lib/api/query-factories";

function MyComponent() {
  const queryClient = useQueryClient();

  const refetchInstallations = () => {
    // Invalidate all installation queries
    queryClient.invalidateQueries({ queryKey: installationsQueries.all() });
  };

  const refetchSingleInstallation = (id: string) => {
    // Invalidate a specific installation
    queryClient.invalidateQueries({ queryKey: installationsQueries.detail(id) });
  };

  return (
    <div>
      <button onClick={refetchInstallations}>Refresh All</button>
      <button onClick={() => refetchSingleInstallation("123")}>
        Refresh Single
      </button>
    </div>
  );
}
```

### Prefetching Data

```typescript
import { useQueryClient } from "@tanstack/react-query";
import { installationsQueries } from "@/lib/api/query-factories";
import { pb } from "@/lib/api/pocketbase";

function InstallationsList() {
  const queryClient = useQueryClient();
  const { data: installations } = useInstallations();

  const handleMouseEnter = (id: string) => {
    // Prefetch installation details on hover
    queryClient.prefetchQuery({
      queryKey: installationsQueries.detail(id),
      queryFn: async () => {
        return pb.collection("nats_auth_operators").getOne(id);
      },
    });
  };

  return (
    <ul>
      {installations?.map((installation) => (
        <li
          key={installation.id}
          onMouseEnter={() => handleMouseEnter(installation.id)}
        >
          <Link to={`/installations/${installation.id}`}>
            {installation.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

## Error Handling

### Custom Error Handling

```typescript
import { useInstallations } from "@/features";
import { getErrorMessage } from "@/lib/errors/error-handler";

function InstallationsList() {
  const { data, error, isError } = useInstallations();

  if (isError) {
    const errorMessage = getErrorMessage(error);
    return (
      <div className="error">
        <h2>Failed to load installations</h2>
        <p>{errorMessage}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return <div>{/* render data */}</div>;
}
```

### Using Error Boundary

```typescript
import { ErrorBoundary } from "@/lib/errors/error-boundary";
import { InstallationsList } from "./InstallationsList";

function App() {
  return (
    <ErrorBoundary
      fallback={
        <div className="error-fallback">
          <h1>Something went wrong</h1>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      }
    >
      <InstallationsList />
    </ErrorBoundary>
  );
}
```
