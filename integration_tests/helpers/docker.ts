import { spawnSync } from "node:child_process";

import {
	TOWER_BASE_URL,
	TOWER_CONTAINER_NAME,
	TOWER_HTTP_PORT,
	TOWER_IMAGE,
} from "../config";

function docker(args: string[], opts: { allowFail?: boolean } = {}) {
	const res = spawnSync("docker", args, { encoding: "utf8" });
	if (res.status !== 0 && !opts.allowFail) {
		throw new Error(
			`docker ${args.join(" ")} failed (code ${res.status}):\n${res.stderr || res.stdout}`,
		);
	}
	return res;
}

/** Remove any pre-existing container with our name (ignoring errors). */
function removeExisting() {
	docker(["rm", "-f", TOWER_CONTAINER_NAME], { allowFail: true });
}

async function waitForReady(timeoutMs = 60_000) {
	const deadline = Date.now() + timeoutMs;
	let lastErr = "";
	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${TOWER_BASE_URL}/api/build_info`, {
				signal: AbortSignal.timeout(2_000),
			});
			if (res.ok) {
				return;
			}
			lastErr = `status ${res.status}`;
		} catch (err) {
			lastErr = err instanceof Error ? err.message : String(err);
		}
		await new Promise((r) => setTimeout(r, 1_000));
	}
	// Surface container logs to make CI failures debuggable.
	const logs = docker(["logs", "--tail", "50", TOWER_CONTAINER_NAME], {
		allowFail: true,
	});
	throw new Error(
		`NATS Tower did not become ready within ${timeoutMs}ms (last error: ${lastErr}).\n` +
			`Container logs:\n${logs.stdout}${logs.stderr}`,
	);
}

/**
 * Pull the prebuilt Tower image and start it with host networking so it can both
 * serve the UI on localhost:8099 and reach the nats-server on localhost:4222.
 */
export async function startTowerContainer() {
	docker(["pull", TOWER_IMAGE]);
	removeExisting();
	docker([
		"run",
		"-d",
		"--name",
		TOWER_CONTAINER_NAME,
		"--network",
		"host",
		TOWER_IMAGE,
		"serve",
		"--http",
		`0.0.0.0:${TOWER_HTTP_PORT}`,
	]);
	await waitForReady();
}

/** Stop and remove the Tower container. Safe to call even if it is not running. */
export function stopTowerContainer() {
	removeExisting();
}
