# Operations

## Security

The application stores all access credentials in the database. This includes the Operator, Account and NATS user credentials to access the NATS cluster. Secure the installation accordingly. Use encryption at rest and in transit.

## Backup & Restore

The application supports backup & restore through the admin interface of [Pocketbase](https://pocketbase.io/). See [here](https://pocketbase.io/docs/going-to-production/#backup-and-restore) for more information.

This makes sure that metadata and user data is stored in a safe place and can be restored in case of a failure. You should use the s3 backup option to store the backups in a safe place. 

> You can also attach something like [litestream](https://litestream.io/) to have a live backup of the database. This is not fully supported by NATS Tower / Pocketbase and you lose e.g. user avatars which are stored on disk.
> But the most important thing is that the database is backed up and can be restored in case of a failure.
> The data is sensitive and should be stored in a safe place. Use encryption at rest and in transit.

The NATS Servers also hold the information about accounts within their resolvers. This information is not backed up by the application and needs to be backed up separately.

> If NATS Tower is down or the database is corrupted, the NATS servers will still work. The accounts and users will still be available. However, adding new accounts or users may not be possible until the system is restored.

## Metrics

> TODO: Expose prometheus metrics for the application
