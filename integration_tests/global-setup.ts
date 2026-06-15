import fs from "node:fs";

import { RUNTIME_DIR } from "./config";
import { startTowerContainer } from "./helpers/docker";
import { resetScreenshots } from "./helpers/screenshot";

/**
 * Global setup: provide a clean runtime dir and start the NATS Tower container.
 * The managed nats-server is started inside the first scenario, once Tower has
 * generated the operator config it needs to trust.
 */
export default async function globalSetup() {
	fs.rmSync(RUNTIME_DIR, { recursive: true, force: true });
	fs.mkdirSync(RUNTIME_DIR, { recursive: true });
	resetScreenshots();
	await startTowerContainer();
}
