# Installation

> The underlying NATS Tower application is based on [Pocketbase](https://pocketbase.io/) and uses its underlying sqlite database to store the data. Using sqlite means that storage is required to run this application. Depending on the size of your installation a fast storage is recommended.

NATS Tower is a single binary application that can be run on any machine that supports Go. It is recommended to run NATS Tower in a containerized environment, such as Docker or Kubernetes.

To run this application on docker use the following command:
```bash
docker run -p 8099:8099 ghcr.io/nats-tower/nats-tower:main serve --http 0.0.0.0:8099
```

> Remember to change the image tag to the latest semver version.

To run this application on Kubernetes please use a StatefulSet.

## Application data

The data is stored in the `/pb_data` directory by default. Remember to mount this directory to a persistent volume in your container runtime to survive restarts of the application.
