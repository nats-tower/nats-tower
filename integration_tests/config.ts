import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const env = process.env;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Root of the integration_tests directory. */
export const ROOT_DIR = __dirname;

/** Scratch directory for the nats-server config, JWT resolver dir, jetstream store and creds files. */
export const RUNTIME_DIR = path.join(ROOT_DIR, ".runtime");

/** Directory where verification screenshots are written. */
export const SCREENSHOTS_DIR = path.join(ROOT_DIR, "screenshots");

/**
 * NATS Tower image used by the suite. Defaults to the prebuilt image; set
 * TOWER_IMAGE to test a locally built image (in which case it is not pulled).
 */
export const TOWER_IMAGE =
	env.TOWER_IMAGE ?? "ghcr.io/nats-tower/nats-tower:main";

/** Whether the suite should pull the Tower image before starting it. */
export const PULL_TOWER_IMAGE = env.TOWER_IMAGE === undefined;

/** Name used for the Tower docker container so we can reliably stop/remove it. */
export const TOWER_CONTAINER_NAME = "nats-tower-e2e";

/** Port the Tower HTTP server (UI + API) listens on. */
export const TOWER_HTTP_PORT = 8099;

/** Base URL of the Tower UI / API. */
export const TOWER_BASE_URL = `http://localhost:${TOWER_HTTP_PORT}`;

/** Port the managed nats-server listens on. */
export const NATS_PORT = 4222;

/** URL used both by Tower (to manage the server) and by the nats CLI (to verify). */
export const NATS_URL = `nats://localhost:${NATS_PORT}`;

/** Default superuser credentials auto-created by Tower on first boot (see cmd/main.go). */
export const ADMIN_EMAIL = "admin@test.org";
export const ADMIN_PASSWORD = "testtest";
