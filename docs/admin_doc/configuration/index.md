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

## Backup & Restore

The application supports backup & restore through the admin interface of [Pocketbase](https://pocketbase.io/). See [here](https://pocketbase.io/docs/going-to-production/#backup-and-restore) for more information.

This makes sure that metadata and user data is stored in a safe place and can be restored in case of a failure.

The NATS Servers also hold the information about accounts within their resolvers. This information is not backed up by the application and needs to be backed up separately.
