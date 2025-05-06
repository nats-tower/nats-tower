# NATS Tower

NATS Tower is a simple multi tenant manager for [NATS](https://nats.io). It allows you to create tenants / accounts, manage users and manage permissions for those users.

> Still work in progress, but it should do what it is supposed to :)  

## Demo instance

You can try out NATS Tower on the demo instance: [https://demo.nats-tower.com](https://demo.nats-tower.com).  
You can login with GitHub or with one of the following credentials:
- **Username**: `app-demo@nats-tower.com`
- **Password**: `nats-tower`
- **Username**: `data-demo@nats-tower.com`
- **Password**: `nats-tower`

You gain access to different NATS accounts if you use the different credentials. The demo instance is limited and will be reset regularly. Do not use it for production workloads. Any user data will be wiped in that process as well.

You will only be able to access the demo instance as a "user" and not as an "admin". This means you will not be able to create new users or accounts. You can only manage your own account.

## Motivation

As hosting NATS is "simple" and more and more applications hop on to NATS, it is getting more and more important to have a good way to manage tenants and users. NATS Tower aims to be a simple solution to this problem.

Starting off with basic username / password authentication, it soon becomes harder to manage subject collisions and resource usages. NATS Tower is here to help you with that.

NATS Tower uses the decentralized JWT authentication to authenticate users and therefore requires your NATS Servers to run in [Operator mode](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/jwt).

### Use cases

#### Multiple Teams

Requirements:

- You have multiple teams that should not be able to see each others messages and communicate via specific imports/exports
- The teams should move fast and should be able to create new subjects, streams and users on their own
- The teams should have a limited set of resources

In this cases each team will get their own account with appropriate resources. In their account they can create users and manage subjects & streams as they please.

#### Single User with several applications

You are a lonely developer (like me) and multiple applications to manage. You want to have a single NATS Server that you can use for all your applications, but you want to make sure that they don't interfere with each other.

Each application can get its own account and you can manage the resources, streams and subjects for each application separately.

## Features

- Multi tenant
- User management via Pocketbase
- NATS User management
- Permission management
- Resource management
- Web based UI
- k8s operator (soon)

## UI screenshots

See [here](./ui/index.md) for a collection of screenshots of the UI.

## Getting started

See [here](./getting_started/index.md) to get started with NATS Tower.

### Bootstrap a NATS installation

To add a new NATS installation, you can add it to NATS Tower by clicking on the `Add` button in the top right corner. Fill in the URLs and give it a description.

Navigate to your newly created NATS installation and click on the `Key` button next to the URLs. This will open up a dialog showing the required NATS Server settings that you need to add to your NATS Server configuration.

> Currently there is no automatic import of existing users & permissions. This is a feature that is planned for the future.

## Planned features

- Stream/KV creation via UI
- Import/Export via UI
- Graph visualization of Import / Export relationships
- k8s operator
