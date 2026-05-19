import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runDoctor } from "../../src/tools/doctor.js";
import type { AzureDevOpsConfig } from "../../src/config/index.js";

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

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
	const originals = new Map<string, string | undefined>();
	for (const [key, value] of Object.entries(vars)) {
		originals.set(key, process.env[key]);
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
	try {
		fn();
	} finally {
		for (const [key, value] of originals) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runDoctor", () => {
	it("returns error when config is missing", async () => {
		withEnv({ AZURE_DEVOPS_ORG_URL: undefined, AZURE_DEVOPS_PROJECT: undefined }, async () => {
			const result = await runDoctor(process.cwd(), undefined, false);
			assert.ok(result.content[0].text.includes("❌"));
			assert.ok(result.content[0].text.includes("configuration issues"));
		});
	});

	it("returns mock report when mock mode is enabled via config", async () => {
		withEnv({ AZURE_DEVOPS_PAT: "fake-token" }, async () => {
			const config = makeConfig({ mock: true });
			const result = await runDoctor(process.cwd(), config, undefined);
			assert.ok(result.content[0].text.includes("Mock Mode"));
			assert.ok(result.content[0].text.includes("simulated as connected"));
			assert.ok(result.content[0].text.includes("simulated as authenticated"));
		});
	});

	it("returns mock report when mock=true parameter is passed", async () => {
		withEnv({ AZURE_DEVOPS_PAT: "fake-token" }, async () => {
			const config = makeConfig({ mock: false });
			const result = await runDoctor(process.cwd(), config, true);
			assert.ok(result.content[0].text.includes("Mock Mode"));
		});
	});

	it("mock report includes org and project", async () => {
		withEnv({ AZURE_DEVOPS_PAT: "fake-token" }, async () => {
			const config = makeConfig({ mock: true });
			const result = await runDoctor(process.cwd(), config, undefined);
			assert.ok(result.content[0].text.includes("testorg"));
			assert.ok(result.content[0].text.includes("TestProject"));
		});
	});

	it("mock report includes safety level", async () => {
		withEnv({ AZURE_DEVOPS_PAT: "fake-token" }, async () => {
			const config = makeConfig({ mock: true, safetyLevel: "readonly" });
			const result = await runDoctor(process.cwd(), config, undefined);
			assert.ok(result.content[0].text.includes("readonly"));
		});
	});
});
