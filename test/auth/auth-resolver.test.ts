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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("resolveAuth", () => {
	it("returns PAT auth when config.pat is set and authMethod is 'pat'", async () => {
		const result = await resolveAuth(makeConfig({ authMethod: "pat", pat: "fake-pat-token" }));
		assert.equal(result.method, "pat");
		assert.ok(result.handler);
	});

	it("throws AuthResolutionError when authMethod is 'pat' and no PAT configured", async () => {
		await assert.rejects(
			() => resolveAuth(makeConfig({ authMethod: "pat" })),
			(err: unknown) => {
				assert(err instanceof AuthResolutionError);
				assert(err.attemptedMethods.some((m) => m.includes("PAT")));
				return true;
			},
		);
	});

	it("prefers PAT in auto mode when config.pat is set", async () => {
		const result = await resolveAuth(makeConfig({ authMethod: "auto", pat: "fake-pat-token" }));
		assert.equal(result.method, "pat");
	});

	it("throws AuthResolutionError when no auth method is available", async () => {
		// Auto mode without PAT and without Azure CLI available
		await assert.rejects(
			() => resolveAuth(makeConfig({ authMethod: "auto" })),
			AuthResolutionError,
		);
	});
});

describe("tryResolveAuth", () => {
	it("returns undefined when no auth method is available", async () => {
		const result = await tryResolveAuth(makeConfig({ authMethod: "pat" }));
		assert.equal(result, undefined);
	});

	it("returns auth result when PAT is available", async () => {
		const result = await tryResolveAuth(makeConfig({ authMethod: "pat", pat: "fake-pat-token" }));
		assert.ok(result);
		assert.equal(result.method, "pat");
	});
});

describe("AuthResolutionError", () => {
	it("includes attempted methods in error info", async () => {
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
