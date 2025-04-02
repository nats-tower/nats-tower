# Getting started

> Familiarize yourself with NATS Tower and its features by reading through the [concept](../concept/index.md).

To get started with NATS Tower, you can either run it as a standalone application or deploy it to your container runtime of choice.

### Standalone Application

Download the latest version of NATS Tower and run the following command to start it:

```bash
./your/path/to/nats-tower serve --http 127.0.0.1:8099
```

### Docker

```bash
docker run -p 8099:8099 ghcr.io/nats-tower/nats-tower:v0.1.0 serve --http 0.0.0.0:8099
```

Next, open your browser and navigate to [http://localhost:8099](http://localhost:8099) to access the NATS Tower interface.

> The default user has the email address `user@test.org` and the default password is `testtest`.  
> The default admin has the email address `admin@test.org` and the default password is `testtest`.
> Please change each user after first login using the admin-account

You can manage teams and users by using the admin interface at `http://localhost:8099/_/`.


### Bootstrap a NATS installation

> Prerequisites:  
> You need to have the [NATS server binary](https://docs.nats.io/running-a-nats-service/introduction/installation) installed.  
> You need to have the [NATS cli installed](https://github.com/nats-io/natscli?tab=readme-ov-file#installation).  
> You followed the NATS Tower installation instructions and have a running NATS Tower instance.

Steps to add a new NATS installation:
1. Login as an admin at `http://localhost:8099/`. (Default admin: `admin@test.org`, password: `testtest`)
2. Create the NATS installation in NATS Tower by clicking on the `+ Add installation` button.
3. Set the URL to `nats://localhost:4222` and give it a description and click on `Add installation`.
4. Select the newly created NATS installation and click on the `Settings` icon next to the URLs.
5. Click on `Copy as NATS Config`.
6. Switch to the console and create a new file called `operator.conf` and paste the copied content into it.
7. Create a new file called `nats-server.conf` in the same folder and paste the following content into it.
```config
port: 4222
http_port: 8222
server_name: n1


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
  store_dir: /tmp/nats/storage/n1
}
```
8. Start the NATS server with the following command in this directory:
```bash
nats-server -c nats-server.conf
```
9. Switch to the web UI and navigate to accounts view using the navigation bar on the left.
10. Add a new account by clicking on the `+ Add account` button in the top right corner.
11. Fill in the account name and description, select the default limit and click on `Add account`.
12. Click on `Manage Users` to manage the users for the account.
13. Add a new NATS user by clicking on the `+ Add user` button in the top right corner.
14. Fill in the username and description and click on `Add user` to create the new user.
15. Click on `View credentials` for the newly created user to view the credentials.
16. Copy the `Creds` section to a file called `nats.creds`
17. Open a new terminal in the same directory as your `nats.creds` file and run the CLI command from the user credentials dialog.
18. You should see a message like `No Streams defined` in the terminal.
19. Congratulations! You have successfully created a new NATS installation, an account and a new user.
