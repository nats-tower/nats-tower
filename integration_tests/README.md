# NATS Tower – End-to-End Integration Tests

Browser-driven integration tests covering the major NATS Tower features. Each
scenario drives the real web UI with Playwright, runs the prebuilt Tower
container, talks to a real `nats-server`, and verifies the result with the
`nats` CLI.

## What is covered

1. **Add a NATS installation** – create an installation in the UI, boot a real
   `nats-server` from the operator config Tower generates, and confirm the UI
   shows the server as connected.
2. **Accounts & users** – create an account and user, then verify the exported
   credentials can authenticate and publish via the `nats` CLI.
3. **Account limits** – create a connection limit, attach it to an account, and
   verify it with `nats account info`.
4. **User roles** – create a scoped role, assign it to a user, and verify the
   user may publish to allowed subjects but is rejected on denied ones.
5. **Removing user access** – delete a user and verify the revoked credentials
   can no longer connect.

## Prerequisites

These are already pinned in the repository `mise.toml` and installed on demand:

- `docker` (to pull and run `ghcr.io/nats-tower/nats-tower:main`)
- `mise` providing `nats-server` and the `nats` CLI
- `bun` (to install the Playwright test runner)

The tests use **host networking** for the Tower container so it can reach the
`nats-server` on `localhost:4222`; this requires Linux.

## Running

```bash
cd integration_tests

# Install the Playwright runner and the Chromium browser.
bun install
bun run install:browsers

# Run the full suite (pulls the image, starts the container + nats-server).
bun run test
```

Viewing the report
```bash
npx playwright show-report
```

Useful variants:

```bash
bun run test:headed   # watch the browser
bun run test:ui       # Playwright UI mode
```

An HTML report is written to `playwright-report/` and runtime artifacts
(nats-server config, JWTs, creds, logs) to `.runtime/` (both git-ignored).

## How it works

- `global-setup.ts` pulls and starts the Tower container and waits for the API.
- The managed `nats-server` is started inside scenario 1 once Tower has produced
  the operator config it needs to trust; `global-teardown.ts` stops both.
- Scenarios run serially (`test.describe.serial`) and share one installation;
  each creates its own account so state does not leak between them.
- Helpers live in `helpers/`: `docker.ts`, `nats-server.ts`, `nats-cli.ts`, and
  the page-object UI flows in `ui.ts`.
