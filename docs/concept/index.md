# Concept

## Terminology

- **Admin**: A person who manages NATS Tower and its resources.
- **User**: A person who uses NATS Tower.
- **Team**: A group of users who share common goals and collaborate on projects.
- **Installation**: A NATS installation that is managed by NATS Tower.
- **Account**: A NATS account that is managed by NATS Tower.
- **NATS User**: A NATS user that is authorized to access a NATS account.
- **Limit**: A restriction on the number of resources that an account can use.

## Features

- **Multi-tenant**: NATS Tower allows you to manage multiple NATS installations and accounts from a single interface.
- **User management**: NATS Tower provides an interface for managing users and their teams.
- **Permission management**: NATS Tower allows you to manage permissions for users and teams.
- **User roles**: NATS Tower lets you define reusable, scoped publish/subscribe permission sets (roles) per account and assign them to users. See [User Roles](../user_roles/index.md).
- **Decentralized JWT authentication**: NATS Tower enables teams to manage their own users within the limits of their accounts.
- **Resource management**: NATS Tower allows you to manage the resources that are available to each account.
- **Web-based UI**: NATS Tower provides a user-friendly web interface for managing NATS installations and accounts.

## How it works

NATS Tower is based on [Pocketbase](https://pocketbase.io/) and uses its underlying sqlite database to store the data. All features of Pocketbase are available in NATS Tower. By design the application is **not** horizontally scalable. To keep things simple, a single instance of NATS Tower with a backup & restore strategy is recommended. The application data should be pretty small and in the worst case scenario will only be down for a few seconds. 

NATS Tower will create a operator JWT and a system account for each NATS installation. Each account that is created will be signed by the operator and then published to the NATS installation. Every NATS user that is created for that account will automatically be trusted by the NATS installation.

### Starting NATS Tower

NATS Tower will create a default admin and a default user when started for the first time. The role of the admins is to manage the NATS installations and accounts. The admins can create new admins, new users and teams, and assign users to teams. The admins can also manage the resources that are available to each account. 
Once an admin has created a NATS installation, they can create accounts for teams. Each account is isolated from the others, and users can only see the accounts that they are assigned to.

> If no teams are assigned to an installation every team will be able to see the installation.  
> You can use that to have the global production installation that all teams can see and use.
> The smaller stage cluster where you plan to test things out can be hidden from the teams that are not involved in the testing.  
> 
> If no teams are assigned to an account every team will be able to see the account and create NATS users in it.

Users can create NATS users in accounts that their teams are assigned to. The credentials of the NATS users can be used to access the NATS cluster in their account.

### Admins

Admins are responsible for managing NATS Tower and its resources. They can create new admins, users, and teams, and assign users to teams. Admins can also manage the resources that are available to each account.

Admins have a specialized view of the NATS installations and accounts. They can see and manipulate all installations and accounts.
Furthermore, they are capable of accessing the [pocketbase](https://pocketbase.io/) admin interface to manage users and teams.

> Currently, the admin interface to manage users and teams is not integrated in the web UI at `http(s)://{host}/`.
> The admin interface is available at `http(s)://{host}/_/` and requires the admin credentials to access.
> Please consult the [pocketbase documentation](https://pocketbase.io/docs/) for more information.

#### Bootstrap a NATS installation

Steps to add a new NATS installation:
1. Create the NATS installation in NATS Tower.
2. Add the NATS server settings to the NATS server configuration.
3. Start or restart the NATS servers.

An admin can add a new NATS installation by clicking on the `+ Add installation` button in the top left corner. The admin will be prompted to enter the URLs of the NATS installation and a description. After the installation is created, the admin can select the installation and click on the `Key` button next to the URLs. This will open a dialog showing the required NATS server settings that need to be added to every NATS server configuration in the (super)cluster.

> Until the settings are added to the NATS server configurations, the Dashboard and other features will not work.

The NATS server settings contain the operator JWT and the system account. The system account is also preloaded into the resolver.

Example NATS server settings:
```config
port: 4445
http_port: 8223
server_name: n2


include operator.conf


resolver: {
    type: full
    # Directory in which account jwt will be stored
    dir: '/tmp/nats/storage/jwt-n2'
    # In order to support jwt deletion, set to true
    # If the resolver type is full delete will rename the jwt.
    # This is to allow manual restoration in case of inadvertent deletion.
    # To restore a jwt, remove the added suffix .delete and restart or send a reload signal.
    # To free up storage you must manually delete files with the suffix .delete.
    allow_delete: true
    # Interval at which a nats-server with a nats based account resolver will compare
    # it's state with one random nats based account resolver in the cluster and if needed,
    # exchange jwt and converge on the same set of jwt.
    interval: "2m"
    # limit on the number of jwt stored, will reject new jwt once limit is hit.
    limit: 1000
}

jetstream: {
  store_dir: /tmp/nats/storage/n2
}


cluster: {
  name: central,
  port: 6223,
  routes: [
    "nats-route://0.0.0.0:6223"
  ],
}


gateway: {
  name: "central",
  port: 7223,
  gateways: [
    {name: "east", urls: ["nats://0.0.0.0:7222"]},
    {name: "central", urls: ["nats://0.0.0.0:7223"]},
    {name: "west", urls: ["nats://0.0.0.0:7224"]},
  ]
}
```

Including the operator.conf that you can copy from the NATS Tower installation:

> Abbreviated for brevity

```config
operator = eyJ0eXAiOiJKV1QiLCJhbGciOiJlZD...

system_account = ABTCQZN2JO4YDBESOTU4IUCAGKVIEU4YXCAPJ...

resolver_preload = {
  ABTCQZN2JO4YDBESOTU4IUCAGKVIEU4YX...: eyJ0eXAiOiJKV1QiLCJhbGciOiJlZDI1NTE5LW5...
}
```

### Users

Users are responsible for using NATS Tower. They can create NATS users in accounts that their teams are assigned to. The credentials of the NATS users can be used to access the NATS cluster in their account.
