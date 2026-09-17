# API Tokens

API tokens let you issue credentials for **automations** (CI systems, scripts,
external tools) that need to call the NATS Tower API of a specific NATS
account without using interactive user logins.

Admins (superusers) create API tokens from the UI. Each token is scoped to a
single account and can only call the **account scoped API** of that account —
not installation level endpoints and not other accounts.

> API tokens are managed per account, from the **API Tokens** page of the
> account (account table → **⋮** menu → **Manage API Tokens**).

## Creating an API token

1. Open the **Accounts** view of your NATS installation.
2. Open the account's **⋮** menu and click **Manage API Tokens**.
3. Click **Add Token**.
4. Fill in:
    - **Name**: a unique name for the token within the account
      (e.g. `ci-automation`).
    - **Description** *(optional)*: anything that helps future readers.
    - **Expires** *(optional)*: an explicit expiration date. Leave empty for
      a token that never expires.
5. Click **Create Token**.

The generated token is shown once in a dialog — copy it, it is what your
automation needs. Tokens can be listed (masked) and deleted at any time from
the API Tokens page. Deleting a token revokes the automation's access
immediately.

## Using an API token

Send the token as a Bearer token in the `Authorization` header of your
requests to the account scoped API:

```
Authorization: Bearer <api token>
```

API tokens are only accepted by the account scoped routes of the account they
were created for, for example:

- `POST /api/nats-tower/installations/{installation_id}/accounts/{account_id}/users/shortlived`

## Generating shortlived user credentials

The first API supported by API tokens generates **shortlived NATS user
credentials** that are scoped to the subjects you specify. The generated
user is ephemeral: it is not stored in NATS Tower and the JWT carries an
explicit expiration, so the credentials stop working after the requested time
to live.

### Request

```
POST /api/nats-tower/installations/{installation_id}/accounts/{account_id}/users/shortlived
Authorization: Bearer <api token>
Content-Type: application/json
```

Body:

| Field        | Type     | Description                                                                 |
| ------------ | -------- | --------------------------------------------------------------------------- |
| `name`       | string   | Name of the generated user (optional, defaults to `shortlived`).            |
| `publish`    | string[] | Subjects the user may publish to (optional).                                |
| `subscribe`  | string[] | Subjects the user may subscribe to (optional).                              |
| `expires_in` | int      | Time to live in seconds (optional, default `3600`, max `86400` / 24 h).     |

> Use NATS subject wildcards to match multiple subjects: `*` matches a single
> token and `>` matches one or more trailing tokens (e.g. `sensors.>`).
> Omit `publish`/`subscribe` to generate a user with the full permissions of
> the account for the given time to live.

### Example

```bash
curl -X POST \
  'https://tower.example.org/api/nats-tower/installations/<installation_id>/accounts/<account_id>/users/shortlived' \
  -H 'Authorization: Bearer <api token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "ci-deploy",
    "publish": ["deploy.>"],
    "subscribe": ["deploy.status.>"],
    "expires_in": 900
  }'
```

### Response

```json
{
  "public_key": "UB...<nkey public key of the generated user>",
  "seed": "SU...<nkey seed of the generated user>",
  "jwt": "eyJ...<signed user JWT with explicit expiration>",
  "creds": "-----BEGIN NATS USER JWT-----\n...\n-----END NATS USER JWT-----\n\nNKEY Seed: SU...",
  "expires_at": "2026-01-01T12:15:00.000Z"
}
```

- **`creds`** is the standard NATS user credentials file. Write it to a file
  (e.g. `/tmp/ci.creds`) and point your client at it:

  ```bash
  nats --server nats://nats.example.org:4222 --creds /tmp/ci.creds pub deploy.start 'v1'
  ```

- **`public_key`** / **`seed`** / **`jwt`** are the individual parts if you
  prefer to configure your client with `NATS_USER` + `NATS_PASSWORD` (seed)
  or with the user JWT directly.

### Error handling

| Status | Meaning                                                                  |
| ------ | ------------------------------------------------------------------------ |
| `400`  | Invalid request body (bad subjects, `expires_in` out of range, …).        |
| `401`  | The presented API token is invalid or expired.                            |
| `403`  | No token presented, or the token is not scoped to this account/installation. |
| `404`  | The account does not exist.                                                |

## Security notes

- Tokens only ever unlock the account scoped API of **their** account.
- Tokens can carry an expiration; prefer setting one for long-running
  automations.
- Shortlived user credentials are signed with the account's main signing key
  and expire after the requested time to live — they cannot outlive the TTL.
- Anyone with access to a token can use it: treat tokens like passwords and
  rotate (create new + delete old) when they may have leaked.
