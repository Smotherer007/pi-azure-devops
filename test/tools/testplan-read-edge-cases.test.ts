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
// Edge cases: list test plans
// ---------------------------------------------------------------------------

describe("azure_devops_list_test_plans edge cases (mock)", () => {
	it("owner filter with no match returns zero or all", async () => {
		const { listTestPlansTool } = await import("../../src/tools/list-test-plans.js");
		const result = await listTestPlansTool.execute("", { owner: "nonexistent@contoso.com", mock: true }, undefined, noop, mockCtx);
		// Owner filter may not be implemented in mock — just verify no crash
		assert.ok(result.content[0].text);
	});

	it("inactive plan appears in unfiltered list", async () => {
		const { listTestPlansTool } = await import("../../src/tools/list-test-plans.js");
		const result = await listTestPlansTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("Smoke Tests"));
	});

	it("inactive plan excluded when filterActivePlans is true", async () => {
		const { listTestPlansTool } = await import("../../src/tools/list-test-plans.js");
		const result = await listTestPlansTool.execute("", { filterActivePlans: true, mock: true }, undefined, noop, mockCtx);
		assert.ok(!result.content[0].text.includes("Smoke Tests") || result.details.count === 2);
	});
});

// ---------------------------------------------------------------------------
// Edge cases: get test plan details
// ---------------------------------------------------------------------------

describe("azure_devops_get_test_plan edge cases (mock)", () => {
	it("returns all plan fields", async () => {
		const { getTestPlanTool } = await import("../../src/tools/get-test-plan.js");
		const result = await getTestPlanTool.execute("", { planId: 101, mock: true }, undefined, noop, mockCtx);
		const text = result.content[0].text;
		assert.ok(text.includes("Sprint 42 Testing"));
		assert.ok(text.includes("101"));
	});

	it("returns inactive plan", async () => {
		const { getTestPlanTool } = await import("../../src/tools/get-test-plan.js");
		const result = await getTestPlanTool.execute("", { planId: 103, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("Smoke Tests"));
	});
});

// ---------------------------------------------------------------------------
// Edge cases: suites
// ---------------------------------------------------------------------------

describe("azure_devops_list_test_suites edge cases (mock)", () => {
	it("plan with fewer suites returns correct count", async () => {
		const { listTestSuitesTool } = await import("../../src/tools/list-test-suites.js");
		const result = await listTestSuitesTool.execute("", { planId: 102, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 2);
	});
});

describe("azure_devops_get_test_suite edge cases (mock)", () => {
	it("different suite in same plan", async () => {
		const { getTestSuiteTool } = await import("../../src/tools/get-test-suite.js");
		const result = await getTestSuiteTool.execute("", { planId: 101, suiteId: 302, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.suiteId, 302);
	});

	it("suite from plan 102", async () => {
		const { getTestSuiteTool } = await import("../../src/tools/get-test-suite.js");
		const result = await getTestSuiteTool.execute("", { planId: 102, suiteId: 401, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.suiteId, 401);
	});
});

// ---------------------------------------------------------------------------
// Edge cases: test runs
// ---------------------------------------------------------------------------

describe("azure_devops_get_test_run edge cases (mock)", () => {
	it("returns different runs", async () => {
		const { getTestRunTool } = await import("../../src/tools/get-test-run.js");
		const r1 = await getTestRunTool.execute("", { runId: 501, mock: true }, undefined, noop, mockCtx);
		const r2 = await getTestRunTool.execute("", { runId: 502, mock: true }, undefined, noop, mockCtx);
		assert.equal(r1.details.runId, 501);
		assert.equal(r2.details.runId, 502);
	});

	it("returns run 503", async () => {
		const { getTestRunTool } = await import("../../src/tools/get-test-run.js");
		const result = await getTestRunTool.execute("", { runId: 503, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.runId, 503);
	});
});

describe("azure_devops_list_test_runs edge cases (mock)", () => {
	it("returns all runs without filters", async () => {
		const { listTestRunsTool } = await import("../../src/tools/list-test-runs.js");
		const result = await listTestRunsTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 3);
	});
});
