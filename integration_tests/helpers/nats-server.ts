import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { NATS_PORT, NATS_URL, ROOT_DIR, RUNTIME_DIR } from "../config";

/** Repository root (parent of integration_tests) so `mise` picks up mise.toml. */
const REPO_ROOT = path.dirname(ROOT_DIR);

const CONFIG_PATH = path.join(RUNTIME_DIR, "nats-server.conf");
const JWT_DIR = path.join(RUNTIME_DIR, "jwt");
const JETSTREAM_DIR = path.join(RUNTIME_DIR, "jetstream");
const LOG_PATH = path.join(RUNTIME_DIR, "nats-server.log");

let proc: ChildProcess | undefined;

/**
 * Build the full nats-server config from the operator config snippet that NATS
 * Tower renders in its installation settings dialog, plus a full account
 * resolver (so Tower can push account JWTs) and JetStream.
 */
function buildConfig(towerSnippet: string): string {
	return `port: ${NATS_PORT}

jetstream {
    store_dir: "${JETSTREAM_DIR}"
}

resolver: {
    type: full
    dir: "${JWT_DIR}"
    allow_delete: true
    interval: "2m"
    limit: 1000
}

${towerSnippet}
`;
}

async function waitForReady(timeoutMs = 30_000) {
	const deadline = Date.now() + timeoutMs;
	let lastErr = "";
	while (Date.now() < deadline) {
		const res = spawnSync(
			"bash",
			["-c", `exec 3<>/dev/tcp/localhost/${NATS_PORT}`],
			{ encoding: "utf8" },
		);
		if (res.status === 0) {
			return;
		}
		lastErr = res.stderr;
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(
		`nats-server did not become reachable on port ${NATS_PORT} within ${timeoutMs}ms (${lastErr}).\n` +
			`Log:\n${readLog()}`,
	);
}

function readLog(): string {
	try {
		return fs.readFileSync(LOG_PATH, "utf8");
	} catch {
		return "<no log>";
	}
}

/**
 * Start a real nats-server configured to trust the operator created by Tower.
 * `towerSnippet` is the `operator = ... / system_account = ... / resolver_preload = {...}`
 * block copied from the installation settings dialog.
 */
export async function startNatsServer(towerSnippet: string) {
	fs.mkdirSync(JWT_DIR, { recursive: true });
	fs.mkdirSync(JETSTREAM_DIR, { recursive: true });
	fs.writeFileSync(CONFIG_PATH, buildConfig(towerSnippet));

	const logFd = fs.openSync(LOG_PATH, "w");
	proc = spawn("mise", ["exec", "--", "nats-server", "-c", CONFIG_PATH], {
		cwd: REPO_ROOT,
		stdio: ["ignore", logFd, logFd],
	});
	proc.on("exit", (code, signal) => {
		if (code !== 0 && code !== null) {
			// eslint-disable-next-line no-console
			console.error(`nats-server exited with code ${code} signal ${signal}`);
		}
	});

	await waitForReady();
	return { url: NATS_URL };
}

/** Stop the nats-server if it is running. */
export function stopNatsServer() {
	if (proc && proc.exitCode === null) {
		proc.kill("SIGTERM");
	}
	proc = undefined;
}
