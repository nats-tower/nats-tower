# Configuration

# Configuration

The configuration of the application is done through environment variables. The following environment variables are available:

| Variable                 | Description                             | Default          |
| ------------------------ | --------------------------------------- | ---------------- |
| `TRACE`                  | Enable trace logging when set to `TRUE` | Not set          |
| `DEFAULT_ADMIN_EMAIL`    | Email for the initial admin user        | `admin@test.org` |
| `DEFAULT_ADMIN_PASSWORD` | Password for the initial admin user     | `testtest`       |
| `DEFAULT_USER_EMAIL`     | Email for the initial regular user      | `user@test.org`  |
| `DEFAULT_USER_PASSWORD`  | Password for the initial regular user   | `testtest`       |
| `API_TOKEN`              | Authentication token for the API        | Not set          |

## SSO

NATS Tower supports SSO through the [Pocketbase](https://pocketbase.io/) admin interface.

Additionally, for Microsoft Azure AD, you can enable a automatic group to teams sync by setting the following environment variables:

| Variable                 | Description                             | Default          |
| Variable                                  | Description                                    | Default |
| ----------------------------------------- | ---------------------------------------------- | ------- |
| `POCKETBASE_AUTH_MICROSOFT_ENABLED`       | Enable Microsoft Azure AD authentication       | `FALSE` |
| `POCKETBASE_AUTH_MICROSOFT_CLIENT_ID`     | Microsoft OAuth2 client ID                     | Not set |
| `POCKETBASE_AUTH_MICROSOFT_CLIENT_SECRET` | Microsoft OAuth2 client secret                 | Not set |
| `POCKETBASE_AUTH_MICROSOFT_AUTH_URL`      | Custom Microsoft authorization URL (if needed) | Not set |
| `POCKETBASE_AUTH_MICROSOFT_TOKEN_URL`     | Custom Microsoft token URL (if needed)         | Not set |
| `POCKETBASE_AUTH_MICROSOFT_TENANT_ID`     | Microsoft Azure AD tenant ID                   | Not set |
| `POCKETBASE_AUTH_MICROSOFT_GROUP_FILTER`  | Filter to apply when syncing Azure AD groups   | Not set |

> In all other cases you need to create the teams yourself or request the feature.
