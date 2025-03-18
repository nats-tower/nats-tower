# User Management

Managing access to NATS Tower is (currently) managed via the admin interface of [Pocketbase](https://pocketbase.io/).

## Adding new users

> Prerequisite: You need to have running NATS Tower instance.

1. Open the admin interface of Pocketbase at `http(s)://<your-nats-tower-url>/_/`
2. Login using the **admin credentials**. Default: `admin@test.org` / `testtest`
3. Click on the `Users` collection in the left sidebar
4. Click on the `+ New record` button in the top right corner

> Refer to the [Pocketbase documentation](https://pocketbase.io/docs/) for more details on user management.

## Adding new admins

> Prerequisite: You need to have running NATS Tower instance.
> Admins are the only users that can manage/create other users.
> Admins can manage backups, restore backups, manage superusers and manage the settings of the Pocketbase instance.

1. Open the admin interface of Pocketbase at `http(s)://<your-nats-tower-url>/_/`
2. Login using the **admin credentials**. Default: `admin@test.org` / `testtest`
3. Click on the your account icon in the lower left corner
4. Click on `Manage superusers`
5. Click on the `+ New record` button in the top right corner
