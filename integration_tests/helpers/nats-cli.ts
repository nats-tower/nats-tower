import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { NATS_URL, ROOT_DIR, RUNTIME_DIR } from "../config";

/** Repository root (parent of integration_tests) so `mise` picks up mise.toml. */
const REPO_ROOT = path.dirname(ROOT_DIR);

export interface NatsResult {
	code: number;
	stdout: string;
	stderr: string;
	/** Combined stdout + stderr for convenient assertions. */
	output: string;
}

/** Persist a creds string to a file under the runtime dir and return its path. */
export function writeCreds(name: string, creds: string): string {
	fs.mkdirSync(RUNTIME_DIR, { recursive: true });
	const file = path.join(RUNTIME_DIR, `${name}.creds`);
	fs.writeFileSync(file, creds, { mode: 0o600 });
	return file;
}

/** Run the `nats` CLI (provided by mise) against the managed server. */
export function runNats(args: string[], opts: { creds?: string } = {}): NatsResult {
	const fullArgs = ["exec", "--", "nats", "--server", NATS_URL];
	if (opts.creds) {
		fullArgs.push("--creds", opts.creds);
	}
	fullArgs.push(...args);

	const res = spawnSync("mise", fullArgs, {
		cwd: REPO_ROOT,
		encoding: "utf8",
		timeout: 20_000,
	});
	const stdout = res.stdout ?? "";
	const stderr = res.stderr ?? "";
	return {
		code: res.status ?? -1,
		stdout,
		stderr,
		output: `${stdout}${stderr}`,
	};
}

/** Publish a single message. Exit code 0 means the connection was authorized. */
export function natsPub(creds: string, subject: string, message: string): NatsResult {
	return runNats(["pub", subject, message], { creds });
}

/** Fetch account information (used to verify applied limits). */
export function natsAccountInfo(creds: string): NatsResult {
	return runNats(["account", "info"], { creds });
}
