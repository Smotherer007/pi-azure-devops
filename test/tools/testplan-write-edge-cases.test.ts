import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { type AzureDevOpsConfig } from "../../src/config/index.ts";

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

const mockCtx = { cwd: "/test", config: makeConfig({ mock: true }) };
const noop = undefined as any;

// ---------------------------------------------------------------------------
// Edge cases: create test run
// ---------------------------------------------------------------------------

describe("azure_devops_create_test_run edge cases (mock)", () => {
	it("creates run with multiple suites", async () => {
		const { createTestRunTool } = await import("../../src/tools/create-test-run.ts");
		const result = await createTestRunTool.execute(
			"",
			{ planId: 101, suiteIds: [301, 302, 303], name: "Multi-Suite Run", mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Multi-Suite Run"));
	});

	it("creates run with custom name containing special chars", async () => {
		const { createTestRunTool } = await import("../../src/tools/create-test-run.ts");
		const result = await createTestRunTool.execute(
			"",
			{ planId: 101, suiteIds: [301], name: "Run (v2.0) - Sprint #42", mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Run (v2.0) - Sprint #42"));
	});

	it("creates run from plan 102", async () => {
		const { createTestRunTool } = await import("../../src/tools/create-test-run.ts");
		const result = await createTestRunTool.execute(
			"",
			{ planId: 102, suiteIds: [401], name: "Regression Run", mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Regression Run"));
	});
});

// ---------------------------------------------------------------------------
// Edge cases: update test results
// ---------------------------------------------------------------------------

describe("azure_devops_update_test_results edge cases (mock)", () => {
	it("updates with all outcome types", async () => {
		const { updateTestResultsTool } = await import("../../src/tools/update-test-results.ts");
		const result = await updateTestResultsTool.execute(
			"",
			{
				runId: 501,
				results: [
					{ id: 1, outcome: "passed" },
					{ id: 2, outcome: "failed" },
					{ id: 3, outcome: "blocked" },
					{ id: 4, outcome: "notExecuted" },
					{ id: 5, outcome: "inconclusive" },
				],
				mock: true,
			},
			undefined,
			noop,
			mockCtx,
		);
		assert.equal(result.details.updatedCount, 5);
	});

	it("updates with comment on each result", async () => {
		const { updateTestResultsTool } = await import("../../src/tools/update-test-results.ts");
		const result = await updateTestResultsTool.execute(
			"",
			{
				runId: 502,
				results: [
					{ id: 1, outcome: "passed", comment: "Works as expected" },
					{ id: 2, outcome: "failed", comment: "Button not clickable" },
				],
				mock: true,
			},
			undefined,
			noop,
			mockCtx,
		);
		assert.equal(result.details.updatedCount, 2);
	});

	it("updates results in different run", async () => {
		const { updateTestResultsTool } = await import("../../src/tools/update-test-results.ts");
		const result = await updateTestResultsTool.execute(
			"",
			{
				runId: 503,
				results: [{ id: 1, outcome: "passed" }],
				mock: true,
			},
			undefined,
			noop,
			mockCtx,
		);
		assert.equal(result.details.runId, 503);
	});
});
