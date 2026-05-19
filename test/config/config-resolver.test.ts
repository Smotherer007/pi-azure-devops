import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { resolveConfig, tryResolveConfig, resolveConfigForDoctor, ConfigError, ensureConfigTemplate } from "../../src/config/index.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testDir = join(tmpdir(), `pi-ado-test-${randomUUID()}`);
const configPath = join(testDir, "pi-azure-devops.json");
const origPiDir = process.env.PI_CODING_AGENT_DIR;

function setup(config: string | null) {
	mkdirSync(testDir, { recursive: true });
	if (config !== null) {
		writeFileSync(configPath, config, "utf-8");
	}
	process.env.PI_CODING_AGENT_DIR = testDir;
}

function teardown() {
	process.env.PI_CODING_AGENT_DIR = origPiDir;
	if (existsSync(testDir)) {
		rmSync(testDir, { recursive: true, force: true });
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("resolveConfig", () => {
	beforeEach(() => {
		if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(teardown);

	it("throws ConfigError when no orgs configured", () => {
		// No config file at all — but ensureConfigTemplate creates one with orgs: []
		// which still fails because there are no orgs
		setup(null);
		assert.throws(() => resolveConfig(), ConfigError);
		teardown();
	});

	it("throws ConfigError when orgs array is empty", () => {
		setup(JSON.stringify({ orgs: [] }));
		assert.throws(() => resolveConfig(), ConfigError);
		teardown();
	});

	it("throws ConfigError when project is missing", () => {
		setup(JSON.stringify({ orgs: [{ name: "test", url: "https://dev.azure.com/test", projects: [] }] }));
		assert.throws(() => resolveConfig(), (err: unknown) => {
			assert(err instanceof ConfigError);
			assert(err.missing[0].includes("project"));
			return true;
		});
		teardown();
	});

	it("resolves config from file with single org/project", () => {
		setup(JSON.stringify({
			orgs: [{
				name: "myorg",
				url: "https://dev.azure.com/myorg",
				projects: [{
					name: "MyProject",
					pat: "fake-token"
				}]
			}],
			safetyLevel: "open"
		}));

		const config = resolveConfig();
		assert.equal(config.orgUrl, "https://dev.azure.com/myorg");
		assert.equal(config.project, "MyProject");
		assert.equal(config.pat, "fake-token");
		assert.equal(config.safetyLevel, "open");
		teardown();
	});

	it("trims trailing slashes from orgUrl", () => {
		setup(JSON.stringify({
			orgs: [{
				name: "myorg",
				url: "https://dev.azure.com/myorg///",
				projects: [{ name: "MyProject", pat: "token" }]
			}]
		}));

		const config = resolveConfig();
		assert.equal(config.orgUrl, "https://dev.azure.com/myorg");
		teardown();
	});

	it("applies defaults for optional fields", () => {
		setup(JSON.stringify({
			orgs: [{
				name: "myorg",
				url: "https://dev.azure.com/myorg",
				projects: [{ name: "MyProject", pat: "token" }]
			}]
		}));

		const config = resolveConfig();
		assert.equal(config.authMethod, "auto");
		assert.equal(config.safetyLevel, "confirm");
		assert.equal(config.defaultWorkItemType, "User Story");
		assert.equal(config.maxQueryResults, 100);
		assert.equal(config.autocomplete, true);
		assert.equal(config.mock, false);
		teardown();
	});

	it("respects mock flag", () => {
		setup(JSON.stringify({
			orgs: [{
				name: "myorg",
				url: "https://dev.azure.com/myorg",
				projects: [{ name: "MyProject", pat: "token" }]
			}],
			mock: true
		}));

		const config = resolveConfig();
		assert.equal(config.mock, true);
		teardown();
	});

	it("ignores invalid safety level values", () => {
		setup(JSON.stringify({
			orgs: [{
				name: "myorg",
				url: "https://dev.azure.com/myorg",
				projects: [{ name: "MyProject", pat: "token" }]
			}],
			safetyLevel: "anything"
		}));

		const config = resolveConfig();
		assert.equal(config.safetyLevel, "confirm");
		teardown();
	});

	it("case-insensitive for auth method and safety level", () => {
		setup(JSON.stringify({
			orgs: [{
				name: "myorg",
				url: "https://dev.azure.com/myorg",
				projects: [{ name: "MyProject", pat: "token" }]
			}],
			authMethod: "PAT",
			safetyLevel: "READONLY"
		}));

		const config = resolveConfig();
		assert.equal(config.authMethod, "pat");
		assert.equal(config.safetyLevel, "readonly");
		teardown();
	});

	it("defaultOrg picks correct org", () => {
		setup(JSON.stringify({
			orgs: [
				{ name: "org1", url: "https://dev.azure.com/org1", projects: [{ name: "P1", pat: "t1" }] },
				{ name: "org2", url: "https://dev.azure.com/org2", projects: [{ name: "P2", pat: "t2" }] }
			],
			defaultOrg: "org2",
			defaultProject: "P2"
		}));

		const config = resolveConfig();
		assert.equal(config.orgUrl, "https://dev.azure.com/org2");
		assert.equal(config.project, "P2");
		assert.equal(config.pat, "t2");
		teardown();
	});
});

describe("tryResolveConfig", () => {
	beforeEach(() => {
		if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(teardown);

	it("returns undefined when config is invalid", () => {
		setup(JSON.stringify({ orgs: [] }));
		assert.equal(tryResolveConfig(), undefined);
		teardown();
	});

	it("returns config when valid", () => {
		setup(JSON.stringify({
			orgs: [{
				name: "myorg",
				url: "https://dev.azure.com/myorg",
				projects: [{ name: "MyProject", pat: "token" }]
			}]
		}));

		const config = tryResolveConfig();
		assert.ok(config);
		assert.equal(config.orgUrl, "https://dev.azure.com/myorg");
		teardown();
	});
});

describe("resolveConfigForDoctor", () => {
	beforeEach(() => {
		if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(teardown);

	it("reports errors when required fields are missing", () => {
		setup(JSON.stringify({ orgs: [] }));
		const report = resolveConfigForDoctor();
		assert.equal(report.config, undefined);
		assert.ok(report.errors.length > 0);
		teardown();
	});

	it("reports warning when PAT not set for pat/auto auth", () => {
		setup(JSON.stringify({
			orgs: [{
				name: "myorg",
				url: "https://dev.azure.com/myorg",
				projects: [{ name: "MyProject" }]
			}],
			authMethod: "pat"
		}));

		const report = resolveConfigForDoctor();
		assert.ok(report.config);
		assert.equal(report.config.authMethod, "pat");
		assert(report.warnings.some((w) => w.includes("PAT")));
		teardown();
	});

	it("returns clean report when everything is configured", () => {
		setup(JSON.stringify({
			orgs: [{
				name: "myorg",
				url: "https://dev.azure.com/myorg",
				projects: [{ name: "MyProject", pat: "fake-token" }]
			}],
			authMethod: "pat"
		}));

		const report = resolveConfigForDoctor();
		assert.ok(report.config);
		assert.equal(report.errors.length, 0);
		assert.equal(report.warnings.length, 0);
		teardown();
	});
});

describe("ensureConfigTemplate", () => {
	beforeEach(() => {
		if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
	});

	afterEach(teardown);

	it("creates template file when config does not exist", () => {
		setup(null);
		// Delete the config file that setup(null) creates via ensureConfigTemplate
		// Actually setup(null) doesn't call ensureConfigTemplate, it just sets the env var.
		// Let the test call it directly.

		const result = ensureConfigTemplate();
		assert.equal(result, true);
		assert.ok(existsSync(configPath));
		teardown();
	});

	it("does not overwrite existing config", () => {
		setup(JSON.stringify({ orgs: [{ name: "existing", url: "https://example.com", projects: [{ name: "P", pat: "t" }] }] }));
		const result = ensureConfigTemplate();
		assert.equal(result, false);
		const content = readFileSync(configPath, "utf-8");
		assert.ok(content.includes("existing"));
		teardown();
	});
});
