import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { resolveConfig, tryResolveConfig, resolveConfigForDoctor, type AzureDevOpsConfig } from "../../src/config/index.js";

describe("resolveConfig team field", () => {
	const baseEnv: Record<string, string | undefined> = {
		AZURE_DEVOPS_ORG_URL: "https://dev.azure.com/testorg",
		AZURE_DEVOPS_PROJECT: "TestProject",
	};

	function withEnv(overrides: Record<string, string | undefined>): void {
		for (const [key, value] of Object.entries(overrides)) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}

	beforeEach(() => {
		// Clean up all Azure DevOps env vars
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("AZURE_DEVOPS_")) delete process.env[key];
		}
	});

	it("returns undefined team when not configured", () => {
		withEnv(baseEnv);
		const config = resolveConfig();
		assert.equal(config.team, undefined);
	});

	it("resolves team from AZURE_DEVOPS_TEAM env var", () => {
		withEnv({ ...baseEnv, AZURE_DEVOPS_TEAM: "Engineering" });
		const config = resolveConfig();
		assert.equal(config.team, "Engineering");
	});

	it("trims whitespace from AZURE_DEVOPS_TEAM", () => {
		withEnv({ ...baseEnv, AZURE_DEVOPS_TEAM: "  Engineering  " });
		const config = resolveConfig();
		assert.equal(config.team, "Engineering");
	});

	it("ignores empty AZURE_DEVOPS_TEAM env var", () => {
		withEnv({ ...baseEnv, AZURE_DEVOPS_TEAM: "" });
		const config = resolveConfig();
		assert.equal(config.team, undefined);
	});

	it("ignores whitespace-only AZURE_DEVOPS_TEAM env var", () => {
		withEnv({ ...baseEnv, AZURE_DEVOPS_TEAM: "   " });
		const config = resolveConfig();
		assert.equal(config.team, undefined);
	});

	it("includes team in resolved config object", () => {
		withEnv({ ...baseEnv, AZURE_DEVOPS_TEAM: "Platform" });
		const config = resolveConfig();
		assert.ok("team" in config);
		assert.equal(config.team, "Platform");
	});
});

describe("tryResolveConfig team field", () => {
	beforeEach(() => {
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("AZURE_DEVOPS_")) delete process.env[key];
		}
	});

	it("returns config with team undefined when valid config exists", () => {
		process.env.AZURE_DEVOPS_ORG_URL = "https://dev.azure.com/testorg";
		process.env.AZURE_DEVOPS_PROJECT = "TestProject";
		const config = tryResolveConfig();
		assert.ok(config);
		assert.equal(config!.team, undefined);
	});

	it("returns config with team when AZURE_DEVOPS_TEAM is set", () => {
		process.env.AZURE_DEVOPS_ORG_URL = "https://dev.azure.com/testorg";
		process.env.AZURE_DEVOPS_PROJECT = "TestProject";
		process.env.AZURE_DEVOPS_TEAM = "QA";
		const config = tryResolveConfig();
		assert.ok(config);
		assert.equal(config!.team, "QA");
	});
});

describe("resolveConfigForDoctor team field", () => {
	beforeEach(() => {
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("AZURE_DEVOPS_")) delete process.env[key];
		}
	});

	it("includes team in clean report", () => {
		process.env.AZURE_DEVOPS_ORG_URL = "https://dev.azure.com/testorg";
		process.env.AZURE_DEVOPS_PROJECT = "TestProject";
		process.env.AZURE_DEVOPS_TEAM = "Engineering";
		const report = resolveConfigForDoctor();
		assert.ok(report.config);
		assert.equal(report.config!.team, "Engineering");
		assert.equal(report.errors.length, 0);
	});

	it("includes team as undefined when not set", () => {
		process.env.AZURE_DEVOPS_ORG_URL = "https://dev.azure.com/testorg";
		process.env.AZURE_DEVOPS_PROJECT = "TestProject";
		const report = resolveConfigForDoctor();
		assert.ok(report.config);
		assert.equal(report.config!.team, undefined);
	});
});
