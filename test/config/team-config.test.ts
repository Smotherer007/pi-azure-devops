import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolveConfig, tryResolveConfig, resolveAllOrgConfigs } from "../../src/config/index.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const testDir = join(tmpdir(), `pi-ado-team-${randomUUID()}`);
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
	orgs: [{ name: "testorg", url: "https://dev.azure.com/testorg", projects: [{ name: "TestProject", pat: "token" }] }],
	...overrides,
});

describe("resolveConfig team field", () => {
	beforeEach(() => {
		if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
		mkdirSync(testDir, { recursive: true });
	});
	afterEach(teardown);

	it("returns undefined team when not configured", () => {
		setup(baseConfig());
		const config = resolveConfig();
		assert.equal(config.team, undefined);
	});

	it("resolves team from defaultTeam config", () => {
		setup(baseConfig({ defaultTeam: "Engineering" }));
		const config = resolveConfig();
		assert.equal(config.team, "Engineering");
	});

	it("trims whitespace from defaultTeam", () => {
		setup(baseConfig({ defaultTeam: "  Engineering  " }));
		const config = resolveConfig();
		assert.equal(config.team, "Engineering");
	});

	it("ignores empty defaultTeam", () => {
		setup(baseConfig({ defaultTeam: "" }));
		const config = resolveConfig();
		assert.equal(config.team, undefined);
	});

	it("ignores whitespace-only defaultTeam", () => {
		setup(baseConfig({ defaultTeam: "   " }));
		const config = resolveConfig();
		assert.equal(config.team, undefined);
	});

	it("includes team in resolved config object", () => {
		setup(baseConfig({ defaultTeam: "Platform" }));
		const config = resolveConfig();
		assert.ok("team" in config);
		assert.equal(config.team, "Platform");
	});
});

describe("tryResolveConfig team field", () => {
	beforeEach(() => {
		if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
		mkdirSync(testDir, { recursive: true });
	});
	afterEach(teardown);

	it("returns config with team undefined when valid config exists", () => {
		setup(baseConfig());
		const config = tryResolveConfig();
		assert.ok(config);
		assert.equal(config!.team, undefined);
	});

	it("returns config with team when defaultTeam is set", () => {
		setup(baseConfig({ defaultTeam: "QA" }));
		const config = tryResolveConfig();
		assert.ok(config);
		assert.equal(config!.team, "QA");
	});
});

describe("resolveAllOrgConfigs team field", () => {
	beforeEach(() => {
		if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
		mkdirSync(testDir, { recursive: true });
	});
	afterEach(teardown);

	it("includes team in all org connections", () => {
		setup(baseConfig({ defaultTeam: "Engineering" }));
		const { connections } = resolveAllOrgConfigs();
		assert.equal(connections.length, 1);
		assert.equal(connections[0].team, "Engineering");
	});

	it("includes team as undefined when not set", () => {
		setup(baseConfig());
		const { connections } = resolveAllOrgConfigs();
		assert.equal(connections.length, 1);
		assert.equal(connections[0].team, undefined);
	});
});
