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

### API Tokens

API tokens let automations call the account scoped NATS Tower API without
interactive user logins. Implementation details:

- A token is stored as a record in the `nats_auth_api_tokens` collection,
  scoped to an account (fields: `name`, `description`, `account`, `token`,
  `expires_at`, plus autodate `created`). The random `nt_`-prefixed token
  value is generated on create (`natsauth/api_tokens.go`, hooked from
  `OnRecordCreate` in `natsauth/nats.go`). Token names are unique per
  account (unique index on `name, account`).
- The collection rules are superuser-only (`@request.auth.collectionName`),
  i.e. only admins can create/manage tokens. Frontend page:
  `frontend/src/pages/_app/.../accounts_/$accountId/api-tokens/index.lazy.tsx`
  (reachable from the account table's ⋮ menu, gated on
  `pb.authStore.isSuperuser`).
- Requests without a PocketBase auth record can present the token as
  `Authorization: Bearer <token>`. The installation/account route group
  middlewares in `interfaces/restapi/routes.go` validate it via
  `NATSAuthModule.AuthenticateAPIToken` and restrict it to the account scoped
  routes of its own account (installation level endpoints stay user-auth
  only). Invalid/expired tokens yield `401`, scope mismatches `403`.
- First supported API: `POST /api/nats-tower/installations/{installation_id}/accounts/{account_id}/users/shortlived`
  (`interfaces/restapi/api_token_handler.go`) generates ephemeral, subject
  scoped user credentials (JWT + nkey seed + formatted creds) with an
  explicit expiration (default 1 h, max 24 h). The users are **not**
  persisted and need no account JWT changes (signed with the account's main
  signing key). See `docs/api_tokens/index.md`.
- E2E: `integration_tests` scenario 6 covers UI token creation, the
  shortlived endpoint and scoped pub/sub against a real nats-server. The
  suite image is overridable via the `TOWER_IMAGE` env (locally built images
  are not pulled).

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
