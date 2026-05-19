import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveAuth, tryResolveAuth, AuthResolutionError } from "../../src/auth/index.js";
import type { AzureDevOpsConfig } from "../../src/config/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<AzureDevOpsConfig> = {}): AzureDevOpsConfig {
	return {
		orgUrl: "https://dev.azure.com/testorg",
		project: "TestProject",
		authMethod: "auto",
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

describe("resolveAuth", () => {
	it("returns PAT auth when AZURE_DEVOPS_PAT is set and authMethod is 'pat'", async () => {
		withEnv({ AZURE_DEVOPS_PAT: "fake-pat-token" }, async () => {
			const result = await resolveAuth(makeConfig({ authMethod: "pat" }));
			assert.equal(result.method, "pat");
			assert.ok(result.handler);
		});
	});

	it("throws AuthResolutionError when authMethod is 'pat' and AZURE_DEVOPS_PAT is not set", async () => {
		withEnv({ AZURE_DEVOPS_PAT: undefined }, async () => {
			await assert.rejects(
				() => resolveAuth(makeConfig({ authMethod: "pat" })),
				(err: unknown) => {
					assert(err instanceof AuthResolutionError);
					assert(err.attemptedMethods.some((m) => m.includes("PAT")));
					return true;
				},
			);
		});
	});

	it("prefers PAT in auto mode when AZURE_DEVOPS_PAT is set", async () => {
		withEnv({ AZURE_DEVOPS_PAT: "fake-pat-token" }, async () => {
			const result = await resolveAuth(makeConfig({ authMethod: "auto" }));
			assert.equal(result.method, "pat");
		});
	});

	it("throws AuthResolutionError when no auth method is available", async () => {
		withEnv({ AZURE_DEVOPS_PAT: undefined }, async () => {
			// Azure CLI will also fail in CI environments
			await assert.rejects(
				() => resolveAuth(makeConfig({ authMethod: "auto" })),
				AuthResolutionError,
			);
		});
	});
});

describe("tryResolveAuth", () => {
	it("returns undefined when no auth method is available", async () => {
		withEnv({ AZURE_DEVOPS_PAT: undefined }, async () => {
			const result = await tryResolveAuth(makeConfig({ authMethod: "pat" }));
			assert.equal(result, undefined);
		});
	});

	it("returns auth result when PAT is available", async () => {
		withEnv({ AZURE_DEVOPS_PAT: "fake-pat-token" }, async () => {
			const result = await tryResolveAuth(makeConfig({ authMethod: "pat" }));
			assert.ok(result);
			assert.equal(result.method, "pat");
		});
	});
});

describe("AuthResolutionError", () => {
	it("includes attempted methods in error info", async () => {
		withEnv({ AZURE_DEVOPS_PAT: undefined }, async () => {
			try {
				await resolveAuth(makeConfig({ authMethod: "pat" }));
				assert.fail("Should have thrown");
			} catch (err) {
				assert(err instanceof AuthResolutionError);
				assert(err.message.includes("No Azure DevOps authentication"));
				assert(err.attemptedMethods.length > 0);
			}
		});
	});
});
