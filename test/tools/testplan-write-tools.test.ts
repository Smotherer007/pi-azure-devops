import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { type AzureDevOpsConfig } from "../../src/config/index.js";

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
// azure_devops_create_test_run
// ---------------------------------------------------------------------------

describe("azure_devops_create_test_run (mock)", () => {
	it("creates run with name", async () => {
		const { createTestRunTool } = await import("../../src/tools/create-test-run.js");
		const result = await createTestRunTool.execute(
			"",
			{ planId: 101, suiteIds: [301], name: "My Run", mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("My Run"));
		assert.equal(result.details.planId, 101);
	});

	it("creates run without name (auto-generated)", async () => {
		const { createTestRunTool } = await import("../../src/tools/create-test-run.js");
		const result = await createTestRunTool.execute(
			"",
			{ planId: 101, suiteIds: [301, 302], mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.details.planId === 101);
	});

	it("includes mock indicator", async () => {
		const { createTestRunTool } = await import("../../src/tools/create-test-run.js");
		const result = await createTestRunTool.execute(
			"",
			{ planId: 101, suiteIds: [301], mock: true },
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("mock") || result.details.mock === true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_update_test_results
// ---------------------------------------------------------------------------

describe("azure_devops_update_test_results (mock)", () => {
	it("updates single result", async () => {
		const { updateTestResultsTool } = await import("../../src/tools/update-test-results.js");
		const result = await updateTestResultsTool.execute(
			"",
			{
				runId: 501,
				results: [{ id: 1, outcome: "passed" }],
				mock: true,
			},
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Updated"));
		assert.equal(result.details.runId, 501);
	});

	it("updates multiple results", async () => {
		const { updateTestResultsTool } = await import("../../src/tools/update-test-results.js");
		const result = await updateTestResultsTool.execute(
			"",
			{
				runId: 501,
				results: [
					{ id: 1, outcome: "passed" },
					{ id: 2, outcome: "failed", comment: "Assertion error" },
					{ id: 3, outcome: "blocked" },
				],
				mock: true,
			},
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Updated"));
		assert.equal(result.details.updatedCount, 3);
	});

	it("includes comments in results", async () => {
		const { updateTestResultsTool } = await import("../../src/tools/update-test-results.js");
		const result = await updateTestResultsTool.execute(
			"",
			{
				runId: 501,
				results: [{ id: 1, outcome: "failed", comment: "Login button not visible" }],
				mock: true,
			},
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("Updated"));
	});

	it("includes mock indicator", async () => {
		const { updateTestResultsTool } = await import("../../src/tools/update-test-results.js");
		const result = await updateTestResultsTool.execute(
			"",
			{
				runId: 501,
				results: [{ id: 1, outcome: "passed" }],
				mock: true,
			},
			undefined,
			noop,
			mockCtx,
		);
		assert.ok(result.content[0].text.includes("mock") || result.details.mock === true);
	});
});
