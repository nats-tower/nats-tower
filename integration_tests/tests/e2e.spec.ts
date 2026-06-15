import { expect, test } from "@playwright/test";

import { NATS_URL } from "../config";
import {
	natsAccountInfo,
	natsPub,
	type NatsResult,
	runNats,
	writeCreds,
} from "../helpers/nats-cli";
import { startNatsServer, stopNatsServer } from "../helpers/nats-server";
import { attachText, shot } from "../helpers/screenshot";
import {
	createAccount,
	createInstallation,
	createLimit,
	createRole,
	createUser,
	deleteUser,
	expectClusterConnected,
	getInstallationConfigSnippet,
	getUserCreds,
	login,
} from "../helpers/ui";

/** Poll `fn` until it returns true or the timeout elapses. */
async function pollUntil(
	fn: () => boolean,
	{ timeoutMs = 15_000, intervalMs = 1_000 } = {},
): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (fn()) return true;
		await new Promise((r) => setTimeout(r, intervalMs));
	}
	return false;
}

test.describe.serial("NATS Tower major features", () => {
	// Shared across the serial scenarios.
	let installationId: string;

	test.beforeAll(async ({ browser }) => {
		const page = await browser.newPage();
		await login(page);
		await page.close();
	});

	test.afterAll(() => {
		stopNatsServer();
	});

	test("1) add a NATS installation and verify it connects", async ({ page }) => {
		await login(page);

		installationId = await createInstallation(page, {
			url: NATS_URL,
			description: "e2e-prod",
		});
		expect(installationId).toBeTruthy();

		// Read the operator config Tower generated and boot a real nats-server with it.
		const snippet = await getInstallationConfigSnippet(page, installationId);
		expect(snippet).toContain("operator");
		expect(snippet).toContain("system_account");
		await startNatsServer(snippet);

		// Tower (via its system user) should now see the server in the cluster.
		await expectClusterConnected(page, installationId);
		await shot(page, "1-installation-connected");
	});

	test("2) add an account and user, verify access with nats CLI", async ({
		page,
	}) => {
		await login(page);

		const accountId = await createAccount(page, installationId, {
			name: "acc-users",
			description: "account for user e2e",
		});
		await createUser(page, installationId, accountId, {
			name: "app-user",
			description: "regular user",
		});

		const creds = await getUserCreds(
			page,
			installationId,
			accountId,
			"app-user",
		);
		expect(creds).toContain("BEGIN NATS USER JWT");
		const credsFile = writeCreds("acc-users-app-user", creds);

		// A successful publish proves the user can authenticate and is authorized.
		const pub = natsPub(credsFile, "app.hello", "hi");
		expect(pub.code, pub.output).toBe(0);
		await attachText("nats pub (app.hello)", pub.output || "published OK");
		await shot(page, "2-account-user-created");
	});

	test("3) add a limit for an account, verify with nats CLI", async ({
		page,
	}) => {
		await login(page);

		// 1 GiB JetStream disk limit – reflected by `nats account info` as the
		// account's storage tier limit (connection limits are not surfaced there).
		await createLimit(page, installationId, {
			name: "limited-storage",
			maxConnections: -1,
			jetstreamMaxDisk: 1024 * 1024 * 1024,
		});

		const accountId = await createAccount(page, installationId, {
			name: "acc-limits",
			description: "account with a storage limit",
			limitName: "limited-storage",
		});
		await createUser(page, installationId, accountId, {
			name: "limited-user",
			description: "user in limited account",
		});

		const creds = await getUserCreds(
			page,
			installationId,
			accountId,
			"limited-user",
		);
		const credsFile = writeCreds("acc-limits-limited-user", creds);

		const info = natsAccountInfo(credsFile);
		expect(info.code, info.output).toBe(0);
		// The configured 1 GiB disk limit must be reflected, not "Unlimited".
		expect(info.output).toMatch(/Storage:.*1\.0 GiB/);
		await attachText("nats account info", info.output);
		await page.goto(`/installations/${installationId}/limits`);
		await shot(page, "3-account-limit-applied");
	});

	test("4) add a user role, verify scoped permissions with nats CLI", async ({
		page,
	}) => {
		await login(page);

		const accountId = await createAccount(page, installationId, {
			name: "acc-roles",
			description: "account for role e2e",
		});
		await createRole(page, installationId, accountId, {
			role: "publisher",
			publish: ["allowed.>"],
			subscribe: ["allowed.>"],
		});
		await createUser(page, installationId, accountId, {
			name: "scoped-user",
			description: "user with publisher role",
			roleName: "publisher",
		});

		const creds = await getUserCreds(
			page,
			installationId,
			accountId,
			"scoped-user",
		);
		const credsFile = writeCreds("acc-roles-scoped-user", creds);

		// Allowed subject: publish succeeds.
		const allowed = natsPub(credsFile, "allowed.test", "hi");
		expect(allowed.code, allowed.output).toBe(0);

		// Denied subject: server rejects with a permissions violation.
		const denied = natsPub(credsFile, "denied.test", "hi");
		expect(
			denied.code !== 0 || /Permissions Violation/i.test(denied.output),
			denied.output,
		).toBeTruthy();
		await attachText(
			"nats pub allowed vs denied",
			`allowed.test => ${allowed.output || "OK"}\n\ndenied.test => ${denied.output}`,
		);
		await page.goto(
			`/installations/${installationId}/accounts/${accountId}/roles`,
		);
		await shot(page, "4-user-role-permissions");
	});

	test("5) remove user access, verify the user can no longer connect", async ({
		page,
	}) => {
		await login(page);

		const accountId = await createAccount(page, installationId, {
			name: "acc-revoke",
			description: "account for revocation e2e",
		});
		await createUser(page, installationId, accountId, {
			name: "doomed-user",
			description: "user to be revoked",
		});

		const creds = await getUserCreds(
			page,
			installationId,
			accountId,
			"doomed-user",
		);
		const credsFile = writeCreds("acc-revoke-doomed-user", creds);

		// Sanity: the user can connect before deletion.
		const before = natsPub(credsFile, "before.delete", "hi");
		expect(before.code, before.output).toBe(0);

		await deleteUser(page, installationId, accountId, "doomed-user");
		await shot(page, "5-user-removed");

		// After revocation the same creds must be rejected by the server.
		let revokedOutput = "";
		const revoked = await pollUntil(() => {
			const res: NatsResult = runNats(["pub", "after.delete", "hi"], {
				creds: credsFile,
			});
			revokedOutput = res.output;
			return res.code !== 0;
		});
		expect(revoked, "expected revoked user creds to be rejected").toBeTruthy();
		await attachText(
			"nats pub after deletion (rejected)",
			`before delete => ${before.output || "OK"}\n\nafter delete => ${revokedOutput}`,
		);
	});
});
