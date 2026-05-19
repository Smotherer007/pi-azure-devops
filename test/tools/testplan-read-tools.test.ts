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
// azure_devops_list_test_plans
// ---------------------------------------------------------------------------

describe("azure_devops_list_test_plans (mock)", () => {
	it("returns all test plans", async () => {
		const { listTestPlansTool } = await import("../../src/tools/list-test-plans.js");
		const result = await listTestPlansTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("Sprint 42 Testing"));
		assert.ok(result.content[0].text.includes("Regression Suite"));
		assert.ok(result.content[0].text.includes("Smoke Tests"));
	});

	it("filters active plans", async () => {
		const { listTestPlansTool } = await import("../../src/tools/list-test-plans.js");
		const result = await listTestPlansTool.execute("", { filterActivePlans: true, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 2);
		assert.ok(result.content[0].text.includes("Sprint 42 Testing"));
		assert.ok(result.content[0].text.includes("Regression Suite"));
	});

	it("includes mock indicator", async () => {
		const { listTestPlansTool } = await import("../../src/tools/list-test-plans.js");
		const result = await listTestPlansTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("mock"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_test_plan
// ---------------------------------------------------------------------------

describe("azure_devops_get_test_plan (mock)", () => {
	it("returns plan by ID", async () => {
		const { getTestPlanTool } = await import("../../src/tools/get-test-plan.js");
		const result = await getTestPlanTool.execute("", { planId: 101, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("Sprint 42 Testing"));
		assert.equal(result.details.planId, 101);
	});

	it("returns error for unknown plan", async () => {
		const { getTestPlanTool } = await import("../../src/tools/get-test-plan.js");
		const result = await getTestPlanTool.execute("", { planId: 999, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_list_test_suites
// ---------------------------------------------------------------------------

describe("azure_devops_list_test_suites (mock)", () => {
	it("returns suites for plan 101", async () => {
		const { listTestSuitesTool } = await import("../../src/tools/list-test-suites.js");
		const result = await listTestSuitesTool.execute("", { planId: 101, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 4);
	});

	it("returns suites for plan 102", async () => {
		const { listTestSuitesTool } = await import("../../src/tools/list-test-suites.js");
		const result = await listTestSuitesTool.execute("", { planId: 102, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 2);
	});

	it("returns error for unknown plan", async () => {
		const { listTestSuitesTool } = await import("../../src/tools/list-test-suites.js");
		const result = await listTestSuitesTool.execute("", { planId: 999, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("No test suites") || result.content[0].text.includes("not found"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_test_suite
// ---------------------------------------------------------------------------

describe("azure_devops_get_test_suite (mock)", () => {
	it("returns suite by ID", async () => {
		const { getTestSuiteTool } = await import("../../src/tools/get-test-suite.js");
		const result = await getTestSuiteTool.execute("", { planId: 101, suiteId: 301, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.suiteId, 301);
	});

	it("returns error for unknown suite", async () => {
		const { getTestSuiteTool } = await import("../../src/tools/get-test-suite.js");
		const result = await getTestSuiteTool.execute("", { planId: 101, suiteId: 999, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_list_test_cases
// ---------------------------------------------------------------------------

describe("azure_devops_list_test_cases (mock)", () => {
	it("returns cases for plan 101 suite 301", async () => {
		const { listTestCasesTool } = await import("../../src/tools/list-test-cases.js");
		const result = await listTestCasesTool.execute("", { planId: 101, suiteId: 301, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.details.count > 0);
	});

	it("returns error for unknown suite", async () => {
		const { listTestCasesTool } = await import("../../src/tools/list-test-cases.js");
		const result = await listTestCasesTool.execute("", { planId: 101, suiteId: 999, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("No test cases") || result.content[0].text.includes("not found"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_list_test_points
// ---------------------------------------------------------------------------

describe("azure_devops_list_test_points (mock)", () => {
	it("returns points for plan 101 suite 301", async () => {
		const { listTestPointsTool } = await import("../../src/tools/list-test-points.js");
		const result = await listTestPointsTool.execute("", { planId: 101, suiteId: 301, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.details.count > 0);
	});

	it("returns error for unknown suite", async () => {
		const { listTestPointsTool } = await import("../../src/tools/list-test-points.js");
		const result = await listTestPointsTool.execute("", { planId: 101, suiteId: 999, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("No test points") || result.content[0].text.includes("not found"));
	});
});

// ---------------------------------------------------------------------------
// azure_devops_get_test_run
// ---------------------------------------------------------------------------

describe("azure_devops_get_test_run (mock)", () => {
	it("returns run by ID", async () => {
		const { getTestRunTool } = await import("../../src/tools/get-test-run.js");
		const result = await getTestRunTool.execute("", { runId: 501, mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.runId, 501);
	});

	it("returns error for unknown run", async () => {
		const { getTestRunTool } = await import("../../src/tools/get-test-run.js");
		const result = await getTestRunTool.execute("", { runId: 999, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// azure_devops_list_test_runs
// ---------------------------------------------------------------------------

describe("azure_devops_list_test_runs (mock)", () => {
	it("returns all test runs", async () => {
		const { listTestRunsTool } = await import("../../src/tools/list-test-runs.js");
		const result = await listTestRunsTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.equal(result.details.count, 3);
	});

	it("filters by planId", async () => {
		const { listTestRunsTool } = await import("../../src/tools/list-test-runs.js");
		const result = await listTestRunsTool.execute("", { planId: 101, mock: true }, undefined, noop, mockCtx);
		assert.ok(result.details.count > 0);
	});

	it("includes mock indicator", async () => {
		const { listTestRunsTool } = await import("../../src/tools/list-test-runs.js");
		const result = await listTestRunsTool.execute("", { mock: true }, undefined, noop, mockCtx);
		assert.ok(result.content[0].text.includes("mock"));
	});
});
