import fs from "node:fs";
import path from "node:path";

import { test, type Page } from "@playwright/test";

import { SCREENSHOTS_DIR } from "../config";

let counter = 0;

/** Ensure a clean screenshots directory once per test run. */
export function resetScreenshots() {
	fs.rmSync(SCREENSHOTS_DIR, { recursive: true, force: true });
	fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Capture a full-page screenshot of the current UI state, save it under
 * `screenshots/` with a sequential, descriptive name, and attach it to the
 * Playwright HTML report.
 */
export async function shot(page: Page, name: string) {
	counter += 1;
	const slug = name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
	const file = `${String(counter).padStart(2, "0")}-${slug}.png`;
	const filePath = path.join(SCREENSHOTS_DIR, file);
	const buffer = await page.screenshot({ path: filePath, fullPage: true });
	await test.info().attach(name, { body: buffer, contentType: "image/png" });
	return filePath;
}

/** Attach raw CLI output (e.g. nats account info) to the report as text. */
export async function attachText(name: string, body: string) {
	await test.info().attach(name, { body, contentType: "text/plain" });
}
