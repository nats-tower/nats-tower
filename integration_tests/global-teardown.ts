import { stopTowerContainer } from "./helpers/docker";
import { stopNatsServer } from "./helpers/nats-server";

/** Global teardown: stop the nats-server and the Tower container. */
export default async function globalTeardown() {
	stopNatsServer();
	stopTowerContainer();
}
