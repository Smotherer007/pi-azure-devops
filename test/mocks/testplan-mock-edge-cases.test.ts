import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	mockListTestPlans,
	mockGetTestPlan,
	mockListTestSuites,
	mockGetTestSuite,
	mockListTestCases,
	mockListTestPoints,
	mockGetTestRun,
	mockListTestRuns,
	mockGetTestResults,
} from "../../src/mocks/mock-handler.js";

// ---------------------------------------------------------------------------
// Fixture loading and consistency
// ---------------------------------------------------------------------------

describe("Test plan fixture loading", () => {
	it("all plans have required fields", () => {
		const result = mockListTestPlans();
		assert.ok(result.details.count > 0);
		assert.ok(result.content[0].text.length > 0);
	});

	it("plan IDs are unique", () => {
		const all = mockListTestPlans();
		const r101 = mockGetTestPlan(101);
		const r102 = mockGetTestPlan(102);
		const r103 = mockGetTestPlan(103);
		assert.notEqual(r101.details.planId, r102.details.planId);
		assert.notEqual(r102.details.planId, r103.details.planId);
		assert.equal(all.details.count, 3);
	});
});

// ---------------------------------------------------------------------------
// Non-existent IDs
// ---------------------------------------------------------------------------

describe("Non-existent ID handling", () => {
	it("plan ID 0 not found", () => {
		const result = mockGetTestPlan(0);
		assert.equal(result.details.error, true);
	});

	it("negative plan ID not found", () => {
		const result = mockGetTestPlan(-1);
		assert.equal(result.details.error, true);
	});

	it("suite ID 0 not found", () => {
		const result = mockGetTestSuite(101, 0);
		assert.equal(result.details.error, true);
	});

	it("run ID 0 not found", () => {
		const result = mockGetTestRun(0);
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// Cross-handler consistency
// ---------------------------------------------------------------------------

describe("Cross-handler consistency", () => {
	it("suites for plan 101 contain known suite IDs", () => {
		const suiteResult = mockListTestSuites(101);
		assert.ok(suiteResult.details.count > 0);
		// Suite 301 should be accessible individually
		const suite301 = mockGetTestSuite(101, 301);
		assert.equal(suite301.details.suiteId, 301);
	});

	it("cases exist for known suite keys", () => {
		const casesResult = mockListTestCases(101, 301);
		assert.ok(casesResult.details.count > 0);
	});

	it("points exist for known suite keys", () => {
		const pointsResult = mockListTestPoints(101, 301);
		assert.ok(pointsResult.details.count > 0);
	});

	it("results exist for known run IDs", () => {
		const resultsResult = mockGetTestResults(501);
		assert.ok(resultsResult.details.count > 0);
	});

	it("all runs are accessible individually", () => {
		const listResult = mockListTestRuns();
		assert.equal(listResult.details.count, 3);
		const r501 = mockGetTestRun(501);
		const r502 = mockGetTestRun(502);
		const r503 = mockGetTestRun(503);
		assert.equal(r501.details.runId, 501);
		assert.equal(r502.details.runId, 502);
		assert.equal(r503.details.runId, 503);
	});
});
