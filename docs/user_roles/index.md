# User Roles

User roles let you define reusable sets of publish and subscribe permissions
and assign them to the NATS users of an account. Instead of giving every user
full account permissions, you can create scoped roles (for example `reader`,
`publisher` or `service-x`) and bind users to them.

> Roles are managed per account. Each role only applies to users of the account
> it was created in.

## Why use roles?

- **Least privilege**: users only get the publish/subscribe subjects they need.
- **Reusability**: define the permissions once and assign them to many users.
- **Central updates**: when you change a role's permissions, every user assigned
  to that role inherits the change automatically — you do not have to recreate
  their credentials.

## Managing roles

1. Open the **Accounts** view of your NATS installation and select an account.
2. Click on **Manage Users**.
3. Click on **Manage Roles** in the top right corner.
4. Click on **Add Role** to create a new role.
5. Fill in the role:
    - **Role Name**: a unique name for the role within the account.
    - **Publish Permissions**: the subjects users with this role are allowed to
      publish to (one subject per line).
    - **Subscribe Permissions**: the subjects users with this role are allowed to
      subscribe to (one subject per line).
6. Click **Save**.

> Use NATS subject wildcards to match multiple subjects:
> `*` matches a single token and `>` matches one or more trailing tokens.
> For example `sensors.>` or `data.events.*`.

You can edit a role at any time to change its permissions, or delete a role that
is no longer needed.

> Editing a role updates the permissions of all users currently assigned to it.

## Assigning a role to a user

1. Open the **Manage Users** view of the account.
2. Click on **Add User**.
3. Fill in the username and description.
4. Select a **Role** from the dropdown:
    - Pick a role to apply its scoped publish/subscribe permissions.
    - Leave it as **No role (full permissions)** to give the user the full
      permissions of the account.
5. Click on **Add User** to create the user with the selected role.

The role assigned to a user is shown in the **Role** column of the users table.

## How permissions are applied

When a user is assigned a role, the user's credentials are bound to that role's
permissions. The user can only publish and subscribe to the subjects defined by
the role. Users without a role keep the full permissions of the account.

Because role permissions are managed centrally, changing a role immediately
affects all of its users without requiring you to regenerate their credentials.
