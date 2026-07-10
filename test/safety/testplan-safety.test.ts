import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isMutationTool,
	shouldBlock,
	formatMutationSummary,
} from "../../src/safety/index.ts";

// ---------------------------------------------------------------------------
// isMutationTool — Test plan tools
// ---------------------------------------------------------------------------

describe("isMutationTool — Test plan tools", () => {
	const testPlanMutations = [
		"azure_devops_create_test_run",
		"azure_devops_update_test_results",
	];

	for (const tool of testPlanMutations) {
		it(`identifies ${tool} as mutation`, () => {
			assert.equal(isMutationTool(tool), true);
		});
	}

	const testPlanReads = [
		"azure_devops_list_test_plans",
		"azure_devops_get_test_plan",
		"azure_devops_list_test_suites",
		"azure_devops_get_test_suite",
		"azure_devops_list_test_cases",
		"azure_devops_list_test_points",
		"azure_devops_get_test_run",
		"azure_devops_list_test_runs",
	];

	for (const tool of testPlanReads) {
		it(`does not flag ${tool} as mutation`, () => {
			assert.equal(isMutationTool(tool), false);
		});
	}
});

// ---------------------------------------------------------------------------
// shouldBlock — Test plan tools
// ---------------------------------------------------------------------------

describe("shouldBlock — Test plan tools", () => {
	const testPlanMutations = [
		"azure_devops_create_test_run",
		"azure_devops_update_test_results",
	];

	for (const tool of testPlanMutations) {
		it(`blocks ${tool} in readonly mode`, () => {
			const result = shouldBlock("readonly", tool);
			assert.ok(result);
			assert.ok(result!.includes("blocked in readonly"));
		});

		it(`allows ${tool} in open mode`, () => {
			assert.equal(shouldBlock("open", tool), undefined);
		});

		it(`does not block ${tool} in confirm mode (interceptor handles)`, () => {
			assert.equal(shouldBlock("confirm", tool), undefined);
		});
	}

	const testPlanReads = [
		"azure_devops_list_test_plans",
		"azure_devops_get_test_plan",
		"azure_devops_list_test_suites",
		"azure_devops_get_test_suite",
		"azure_devops_list_test_cases",
		"azure_devops_list_test_points",
		"azure_devops_get_test_run",
		"azure_devops_list_test_runs",
	];

	for (const tool of testPlanReads) {
		it(`does not block read tool ${tool} in any mode`, () => {
			assert.equal(shouldBlock("readonly", tool), undefined);
			assert.equal(shouldBlock("confirm", tool), undefined);
			assert.equal(shouldBlock("open", tool), undefined);
		});
	}
});

// ---------------------------------------------------------------------------
// formatMutationSummary — Test plan tools
// ---------------------------------------------------------------------------

describe("formatMutationSummary — Test plan tools", () => {
	it("formats azure_devops_create_test_run with name", () => {
		const summary = formatMutationSummary("azure_devops_create_test_run", {
			planId: 101,
			name: "Sprint 42 Manual Run",
		});
		assert.ok(summary.includes("Create test run"));
		assert.ok(summary.includes("Sprint 42 Manual Run"));
		assert.ok(summary.includes("plan #101"));
	});

	it("formats azure_devops_create_test_run without name", () => {
		const summary = formatMutationSummary("azure_devops_create_test_run", {
			planId: 102,
		});
		assert.ok(summary.includes("Create test run"));
		assert.ok(summary.includes("(auto-named)"));
		assert.ok(summary.includes("plan #102"));
	});

	it("formats azure_devops_update_test_results with results", () => {
		const summary = formatMutationSummary("azure_devops_update_test_results", {
			runId: 501,
			results: [
				{ id: 1, outcome: "passed" },
				{ id: 2, outcome: "failed" },
				{ id: 3, outcome: "blocked" },
			],
		});
		assert.ok(summary.includes("Update 3 test result(s)"));
		assert.ok(summary.includes("run #501"));
	});

	it("formats azure_devops_update_test_results with no results", () => {
		const summary = formatMutationSummary("azure_devops_update_test_results", {
			runId: 502,
		});
		assert.ok(summary.includes("Update 0 test result(s)"));
		assert.ok(summary.includes("run #502"));
	});
});
