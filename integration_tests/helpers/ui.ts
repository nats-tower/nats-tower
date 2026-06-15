import { expect, type Page } from "@playwright/test";

import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../config";

/** Log in as the auto-created superuser (admin) via the sign-in form. */
export async function login(page: Page) {
	await page.goto("/signin");
	await page.locator("#email").waitFor({ state: "visible" });
	await page.locator("#email").fill(ADMIN_EMAIL);
	await page.locator("#password").fill(ADMIN_PASSWORD);
	// Radix checkbox renders a button[role=checkbox]; click it to enable admin auth.
	await page.locator("#admin-auth").click();
	await page.getByRole("button", { name: "Sign in" }).click();
	await page.waitForURL("**/installations**", { timeout: 15_000 });
}

/** Create a new installation (operator) pointing at the given NATS URL. */
export async function createInstallation(
	page: Page,
	opts: { url: string; description: string },
): Promise<string> {
	await page.goto("/installations");
	await page.getByRole("button", { name: "Add Installation" }).click();

	const dialog = page.getByRole("dialog");
	await dialog.locator("#url").fill(opts.url);
	await dialog.locator("#description").fill(opts.description);
	await dialog.getByRole("button", { name: "Add Installation" }).click();
	await expect(dialog).toBeHidden();

	// Open the freshly created installation to read its id from the URL.
	await page.getByText(opts.description, { exact: false }).first().click();
	await page.waitForURL("**/installations/*");
	const id = page.url().split("/installations/")[1].split(/[/?#]/)[0];
	return id;
}

/**
 * Open the installation settings dialog and return the NATS server config
 * snippet (operator / system_account / resolver_preload) that Tower renders.
 */
export async function getInstallationConfigSnippet(
	page: Page,
	installationId: string,
): Promise<string> {
	await page.goto(`/installations/${installationId}`);
	await page.locator("#installation-url").waitFor({ state: "visible" });
	// The gear button is the 2nd icon button in the URL card (1st is copy).
	await page
		.locator("#installation-url")
		.locator(
			'xpath=../../div[contains(@class,"ml-auto")]/button[2]',
		)
		.click();

	const dialog = page.getByRole("dialog");
	const textarea = dialog.locator("textarea");
	await textarea.waitFor({ state: "visible" });
	const snippet = await textarea.inputValue();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	return snippet;
}

/**
 * Wait until the cluster info section shows at least one connected server,
 * confirming Tower can reach the managed nats-server.
 */
export async function expectClusterConnected(page: Page, installationId: string) {
	await page.goto(`/installations/${installationId}`);
	// "Used Cores" only renders inside a server card when a server is reachable.
	await expect(page.getByText("Used Cores").first()).toBeVisible({
		timeout: 30_000,
	});
}

/** Create an account-scoped limit on the installation limits page. */
export async function createLimit(
	page: Page,
	installationId: string,
	opts: {
		name: string;
		maxConnections: number;
		jetstreamMaxDisk?: number;
		jetstreamMaxMemory?: number;
	},
) {
	await page.goto(`/installations/${installationId}/limits`);
	await page.getByRole("button", { name: "Add Limit" }).click();

	const dialog = page.getByRole("dialog");
	await dialog.locator("#name").fill(opts.name);
	await dialog.locator("#max_connections").fill(String(opts.maxConnections));
	await dialog
		.locator("#jetstream_max_disk")
		.fill(String(opts.jetstreamMaxDisk ?? -1));
	await dialog
		.locator("#jetstream_max_memory")
		.fill(String(opts.jetstreamMaxMemory ?? -1));
	await dialog.getByRole("button", { name: "Add Limit" }).click();
	await expect(dialog).toBeHidden();
}

/** Create an account, optionally assigning a previously created limit by name. */
export async function createAccount(
	page: Page,
	installationId: string,
	opts: { name: string; description: string; limitName?: string },
): Promise<string> {
	await page.goto(`/installations/${installationId}/accounts`);
	await page.getByRole("button", { name: "Add account" }).click();

	const dialog = page.getByRole("dialog");
	await dialog.getByPlaceholder("Enter account name").fill(opts.name);
	await dialog
		.getByPlaceholder("Enter account description")
		.fill(opts.description);

	if (opts.limitName) {
		await dialog.getByText("Select a limit to apply").click();
		await page.getByRole("option", { name: opts.limitName }).click();
	}

	await dialog.getByRole("button", { name: "Add account" }).click();
	await expect(dialog).toBeHidden();

	// Navigate into the account via "Manage Users" to capture its id.
	return openAccountUsers(page, installationId, opts.name);
}

/** Navigate to the users page of a named account and return the account id. */
export async function openAccountUsers(
	page: Page,
	installationId: string,
	accountName: string,
): Promise<string> {
	await page.goto(`/installations/${installationId}/accounts`);
	await page
		.getByRole("row")
		.filter({ hasText: accountName })
		.getByRole("button", { name: "Manage Users" })
		.click();
	await page.waitForURL("**/accounts/*/users**");
	const id = page.url().split("/accounts/")[1].split(/[/?#]/)[0];
	return id;
}

/** Create a user in an account, optionally assigning a role (signing key) by name. */
export async function createUser(
	page: Page,
	installationId: string,
	accountId: string,
	opts: { name: string; description: string; roleName?: string },
) {
	await page.goto(
		`/installations/${installationId}/accounts/${accountId}/users`,
	);
	await page.getByRole("button", { name: "Add User" }).click();

	const dialog = page.getByRole("dialog");
	await dialog.locator("#name").fill(opts.name);
	await dialog.locator("#description").fill(opts.description);

	if (opts.roleName) {
		await dialog.locator("#role-select").click();
		await page.getByRole("option", { name: opts.roleName }).click();
	}

	await dialog.getByRole("button", { name: "Add User" }).click();
	await expect(dialog).toBeHidden();
}

/** Open a user's "View credentials" dialog and return the creds string. */
export async function getUserCreds(
	page: Page,
	installationId: string,
	accountId: string,
	userName: string,
): Promise<string> {
	await page.goto(
		`/installations/${installationId}/accounts/${accountId}/users`,
	);
	await page
		.getByRole("row")
		.filter({ hasText: userName })
		.getByRole("button", { name: "View credentials" })
		.click();

	const dialog = page.getByRole("dialog");
	// The "Creds" credential box textarea holds the full creds file.
	const credsBox = dialog
		.locator("div")
		.filter({ has: page.getByRole("heading", { name: "Creds", exact: true }) })
		.locator("textarea");
	await credsBox.first().waitFor({ state: "visible" });
	const creds = await credsBox.first().inputValue();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	return creds;
}

/** Create a role (scoped signing key) with publish/subscribe permissions. */
export async function createRole(
	page: Page,
	installationId: string,
	accountId: string,
	opts: { role: string; publish: string[]; subscribe: string[] },
) {
	await page.goto(
		`/installations/${installationId}/accounts/${accountId}/roles`,
	);
	await page.getByRole("button", { name: "Add Role" }).click();

	const dialog = page.getByRole("dialog");
	await dialog.locator("#role").fill(opts.role);
	await dialog.locator("#publish").fill(opts.publish.join("\n"));
	await dialog.locator("#subscribe").fill(opts.subscribe.join("\n"));
	await dialog.getByRole("button", { name: "Add Role" }).click();
	await expect(dialog).toBeHidden();
}

/** Delete a user via the row actions popover (accepts the confirm dialog). */
export async function deleteUser(
	page: Page,
	installationId: string,
	accountId: string,
	userName: string,
) {
	await page.goto(
		`/installations/${installationId}/accounts/${accountId}/users`,
	);
	page.once("dialog", (d) => d.accept());
	const row = page.getByRole("row").filter({ hasText: userName });
	// The row's last icon button opens the actions popover.
	await row.getByRole("button").last().click();
	await page.getByRole("button", { name: "Delete User" }).click();
	// Wait until the user row is gone.
	await expect(
		page.getByRole("row").filter({ hasText: userName }),
	).toHaveCount(0, { timeout: 15_000 });
}
