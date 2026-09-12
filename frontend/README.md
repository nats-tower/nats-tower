# NATS Tower Frontend

React-based web UI for NATS Tower, built with the following tech stack:

- [React](https://reactjs.org/) — UI library
- [TypeScript](https://www.typescriptlang.org/) — type-safe JavaScript
- [Vite](https://vitejs.dev/) — build tool
- [Tailwind CSS](https://tailwindcss.com/) — utility-first CSS
- [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) — accessible components
- [TanStack Router](https://tanstack.com/router/latest/docs/framework/react/overview) — file-based routing
- [TanStack Query](https://tanstack.com/query/latest) — server state management
- [Pocketbase](https://pocketbase.io/) — backend (via `pocketbase-typegen` for type safety)
- [Bun](https://bun.sh/) — package manager & runtime

## Getting Started

### Install dependencies

```bash
bun install
```

### Run development server

```bash
bun run dev
```

This starts the Vite dev server with hot reload.

### Build for production

```bash
bun run build
```

### Lint

```bash
bun run lint
```

## Pages

Pages are defined in `src/pages/` using TanStack Router's file-based routing:

- `src/pages/_app.tsx` — protected route group (shared layout)
- `src/pages/_app/index.lazy.tsx` — dashboard
- `src/pages/_app/installations/index.lazy.tsx` — installations list
- `src/pages/_app/installations_/$installationId/accounts/index.lazy.tsx` — accounts
- `src/pages/_app/installations_/$installationId/accounts_/$accountId/users/index.lazy.tsx` — users
- `src/pages/_app/installations_/$installationId/accounts_/$accountId/roles/index.lazy.tsx` — roles
- `src/pages/_app/installations_/$installationId/accounts_/$accountId/k8s-access/index.lazy.tsx` — K8s access
- `src/pages/_app/installations_/$installationId/accounts_/$accountId/imports/index.lazy.tsx` — imports
- `src/pages/_app/installations_/$installationId/accounts_/$accountId/exports/index.lazy.tsx` — exports
- `src/pages/signin.lazy.tsx` — sign-in page

Pages named `*.lazy.tsx` are code-split and loaded on demand.

## Navigation & Menu

The sidebar navigation is defined in `src/config/menu.ts`. Add new menu entries by adding to the `getMenuEntries()` array.

## UI Components

Components are based on [shadcn/ui](https://ui.shadcn.com/) and live in `src/components/ui/`. Domain-specific components (accounts, users, roles, installations, etc.) are organized by feature:

- `src/components/ui/accounts/` — account CRUD
- `src/components/ui/users/` — user CRUD & credentials
- `src/components/ui/roles/` — role management
- `src/components/ui/installations/` — installation CRUD
- `src/components/ui/k8s-access/` — K8s cluster access management
- `src/components/ui/limits/` — account limits
- `src/components/ui/imports/` — account imports
- `src/components/ui/exports/` — account exports

## Authentication

Authentication is handled by Pocketbase. The `/signin` page supports email/password and any enabled OAuth providers (e.g. GitHub, Microsoft Azure AD).

After signing in, users are redirected to the application. The `_app` route group ensures all protected pages require authentication.

## Pocketbase Typegen

Types are generated from the Pocketbase schema. Regenerate after schema changes:

```bash
bun run pb:typegen
```

## Docker

The frontend is built in the first stage of `docker/Dockerfile` (at the repo root) and embedded into the Go binary via `//go:embed wwwroot/**`.
