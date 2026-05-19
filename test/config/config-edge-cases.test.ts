import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolveConfig, ConfigError } from "../../src/config/index.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const testDir = join(tmpdir(), `pi-ado-edge-${randomUUID()}`);
const configPath = join(testDir, "pi-azure-devops.json");
const origPiDir = process.env.PI_CODING_AGENT_DIR;

function setup(json: string) {
	mkdirSync(testDir, { recursive: true });
	writeFileSync(configPath, json, "utf-8");
	process.env.PI_CODING_AGENT_DIR = testDir;
}

function teardown() {
	process.env.PI_CODING_AGENT_DIR = origPiDir;
	if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
}

const baseConfig = (overrides: Record<string, unknown> = {}) => JSON.stringify({
	orgs: [{ name: "myorg", url: "https://dev.azure.com/myorg", projects: [{ name: "MyProject", pat: "token" }] }],
	...overrides,
});

describe("resolveConfig edge cases", () => {
	beforeEach(() => {
		if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
		mkdirSync(testDir, { recursive: true });
	});
	afterEach(teardown);

	it("trims multiple trailing slashes", () => {
		setup(baseConfig({ orgs: [{ name: "myorg", url: "https://dev.azure.com/myorg///", projects: [{ name: "MyProject", pat: "token" }] }] }));
		const config = resolveConfig();
		assert.equal(config.orgUrl, "https://dev.azure.com/myorg");
	});

	it("handles whitespace in auth method", () => {
		setup(baseConfig({ authMethod: "  pat  " }));
		const config = resolveConfig();
		assert.equal(config.authMethod, "pat");
	});

	it("handles mixed case safety level", () => {
		setup(baseConfig({ safetyLevel: "ReAdOnLy" }));
		const config = resolveConfig();
		assert.equal(config.safetyLevel, "readonly");
	});

	it("does not enable mock when mock is false", () => {
		setup(baseConfig({ mock: false }));
		const config = resolveConfig();
		assert.equal(config.mock, false);
	});

	it("enables mock when mock is true", () => {
		setup(baseConfig({ mock: true }));
		const config = resolveConfig();
		assert.equal(config.mock, true);
	});

	it("resolves with azure-cli auth method", () => {
		setup(baseConfig({ authMethod: "azure-cli" }));
		const config = resolveConfig();
		assert.equal(config.authMethod, "azure-cli");
	});

	it("ConfigError has correct name property", () => {
		setup(JSON.stringify({ orgs: [] }));
		try {
			resolveConfig();
			assert.fail("Should have thrown");
		} catch (err) {
			assert(err instanceof ConfigError);
			assert.equal(err.name, "ConfigError");
		}
	});

	it("defaults autocomplete to true", () => {
		setup(baseConfig());
		const config = resolveConfig();
		assert.equal(config.autocomplete, true);
	});

	it("defaults maxQueryResults to 100", () => {
		setup(baseConfig());
		const config = resolveConfig();
		assert.equal(config.maxQueryResults, 100);
	});

	it("defaults defaultWorkItemType to User Story", () => {
		setup(baseConfig());
		const config = resolveConfig();
		assert.equal(config.defaultWorkItemType, "User Story");
	});

	it("resolves confirm safety level", () => {
		setup(baseConfig({ safetyLevel: "confirm" }));
		const config = resolveConfig();
		assert.equal(config.safetyLevel, "confirm");
	});

	it("resolves open safety level", () => {
		setup(baseConfig({ safetyLevel: "open" }));
		const config = resolveConfig();
		assert.equal(config.safetyLevel, "open");
	});

	it("handles missing pat (resolves without)", () => {
		setup(baseConfig({ orgs: [{ name: "myorg", url: "https://dev.azure.com/myorg", projects: [{ name: "MyProject" }] }] }));
		const config = resolveConfig();
		assert.equal(config.pat, undefined);
		assert.equal(config.orgUrl, "https://dev.azure.com/myorg");
	});
});
