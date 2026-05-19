import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { runDoctor } from "../../src/tools/doctor.js";
import type { AzureDevOpsConfig } from "../../src/config/index.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<AzureDevOpsConfig> = {}): AzureDevOpsConfig {
	return {
		orgUrl: "https://dev.azure.com/testorg",
		project: "TestProject",
		authMethod: "pat",
		safetyLevel: "confirm",
		defaultWorkItemType: "User Story",
		maxQueryResults: 100,
		autocomplete: true,
		mock: false,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runDoctor", () => {
	const testDir = join(tmpdir(), `pi-ado-doctor-${randomUUID()}`);
	const origPiDir = process.env.PI_CODING_AGENT_DIR;

	beforeEach(() => {
		if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
		mkdirSync(testDir, { recursive: true });
		process.env.PI_CODING_AGENT_DIR = testDir;
	});

	afterEach(() => {
		process.env.PI_CODING_AGENT_DIR = origPiDir;
		if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
	});

	it("returns error when config is missing", async () => {
		const result = await runDoctor(testDir, undefined, false);
		assert.ok(result.content[0].text.includes("❌"));
		assert.ok(result.content[0].text.includes("configuration issues"));
	});

	it("returns mock report when mock mode is enabled via config", async () => {
		const config = makeConfig({ mock: true });
		const result = await runDoctor(testDir, config, undefined);
		assert.ok(result.content[0].text.includes("Mock Mode"));
		assert.ok(result.content[0].text.includes("simulated as connected"));
		assert.ok(result.content[0].text.includes("simulated as authenticated"));
		assert.ok(result.content[0].text.includes("Orgs configured: 1"));
	});

	it("returns mock report when mock=true parameter is passed", async () => {
		const config = makeConfig({ mock: false });
		const result = await runDoctor(testDir, config, true);
		assert.ok(result.content[0].text.includes("Mock Mode"));
		assert.ok(result.content[0].text.includes("Orgs configured: 1"));
	});

	it("mock report includes org and project", async () => {
		const config = makeConfig({ mock: true });
		const result = await runDoctor(testDir, config, undefined);
		assert.ok(result.content[0].text.includes("testorg"));
		assert.ok(result.content[0].text.includes("TestProject"));
	});

	it("mock report includes org count and sections", async () => {
		const config = makeConfig({ mock: true });
		const result = await runDoctor(testDir, config, undefined);
		assert.ok(result.content[0].text.includes("### testorg / TestProject"));
		assert.ok(result.content[0].text.includes("- **URL:** https://dev.azure.com/testorg"));
	});
});
