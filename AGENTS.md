# NATS Tower - Agent Instructions

This document serves as the entry point for AI agents working on the NATS Tower project.

## Quick Start for Agents

When starting a task, please:

1.  **Identify the domain** of the task (Backend, Frontend, or Docker/Infra).
2.  **Refer to the Technology Stack Summary and Common Commands below** for project-wide conventions.

## Pre-Commit / Pre-Push / Pre-PR Requirement

Before creating any commit, pushing, or opening a pull request, run the full
end-to-end integration test suite and make sure it passes:

```bash
cd integration_tests
bun install
bun run install:browsers   # first run only, installs the Chromium browser
bun run test
```

The suite pulls the prebuilt Tower image, starts a real `nats-server`, drives
the web UI with Playwright, and verifies behavior with the `nats` CLI. Do not
commit, push, or open a PR if any scenario fails. See
[integration_tests/README.md](integration_tests/README.md) for details.

## Feature Notes

### User Roles

User roles let operators define reusable, scoped publish/subscribe permission
sets per account and assign them to NATS users. Implementation details:

- A role is stored as a record in the `nats_auth_signing_keys` collection,
  scoped to an account (fields: `role`, `account`, `publish`, `subscribe`,
  plus the generated nkey `public_key`/`private_key`/`seed`). Role names are
  unique per account (unique index on `role, account`).
- On create, the backend (`natsauth/nats.go`) generates an account-scoped
  signing key (`generateSigningKeyRecord`) and adds a scoped signer to the
  account JWT via `syncSigningKeyScopeToAccount`
  (`natsauth/signing_keys.go`). The role's `publish`/`subscribe` subjects
  become the `UserScope` permission template
  (`buildUserScopeFromSigningKeyRecord`).
- A NATS user (`nats_auth_users`) optionally references a role through its
  `signing_key` field. When set, the user JWT is signed with the role's
  signing key seed and marked `SetScoped(true)`
  (`generateUserRecordWithPermissions` in `natsauth/generators.go`), so the
  user inherits permissions from the account's scoped signing key. Without a
  role, the user is signed by the account's main signing key with full
  permissions.
- Because scoped users derive permissions from the account JWT, editing a role
  re-syncs the account JWT and updates all assigned users automatically — no
  need to regenerate user credentials.
- Frontend: roles are managed under
  `frontend/src/pages/_app/.../accounts_/$accountId/roles/index.lazy.tsx`;
  role assignment happens in the users page and is rendered by
  `frontend/src/components/ui/users/user-columns.tsx`.

## Technology Stack Summary

-   **Backend:** Go 1.24+ with Pocketbase v0.28.1
-   **Frontend:** React 19+ with TypeScript, Vite, TanStack Router/Query
-   **Styling:** Tailwind CSS v4+ with Radix UI components
-   **Package Manager:** bun (frontend and integration tests)
-   **Container:** Docker multi-stage builds with distroless final image
-   **Database:** SQLite via Pocketbase
-   **Authentication:** NATS JWT with operator mode
-   **E2E Tests:** Playwright (run with bun) under `integration_tests/`

## Common Commands

### Backend
```bash
# Build
CGO_ENABLED=0 go build -mod=vendor -o ./nats-tower ./cmd/

# Test
go test -v ./...

# Run
./nats-tower serve --http 0.0.0.0:8099
```

### Frontend
```bash
cd frontend

# Install
bun install

# Dev
bun run dev

# Build
bun run build

# Lint
bun run lint
```

### Integration Tests (E2E)
```bash
cd integration_tests

# Install dependencies and the Chromium browser (first run only)
bun install
bun run install:browsers

# Run the full end-to-end suite
bun run test
```

### Docker
```bash
# Build
docker build -f docker/Dockerfile -t nats-tower .

# Run
docker run -p 8099:8099 nats-tower serve --http 0.0.0.0:8099
```
