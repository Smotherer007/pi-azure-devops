import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	mockListTestPlans,
	mockGetTestPlan,
	mockListTestSuites,
	mockGetTestSuite,
	mockListTestCases,
	mockListTestPoints,
	mockCreateTestRun,
	mockUpdateTestResults,
	mockGetTestRun,
	mockListTestRuns,
	mockGetTestResults,
} from "../../src/mocks/mock-handler.js";

// ---------------------------------------------------------------------------
// mockListTestPlans
// ---------------------------------------------------------------------------

describe("mockListTestPlans", () => {
	it("returns all plans", () => {
		const result = mockListTestPlans();
		assert.equal(result.details.count, 3);
		assert.ok(result.content[0].text.includes("Sprint 42 Testing"));
	});

	it("filters active plans", () => {
		const result = mockListTestPlans({ filterActivePlans: true });
		assert.equal(result.details.count, 2);
	});

	it("includes mock indicator", () => {
		const result = mockListTestPlans();
		assert.equal(result.details.mock, true);
	});
});

// ---------------------------------------------------------------------------
// mockGetTestPlan
// ---------------------------------------------------------------------------

describe("mockGetTestPlan", () => {
	it("returns plan by ID", () => {
		const result = mockGetTestPlan(101);
		assert.ok(result.content[0].text.includes("Sprint 42 Testing"));
		assert.equal(result.details.planId, 101);
	});

	it("returns error for unknown plan", () => {
		const result = mockGetTestPlan(999);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});

	it("returns plan 102", () => {
		const result = mockGetTestPlan(102);
		assert.ok(result.content[0].text.includes("Regression Suite"));
	});

	it("returns plan 103", () => {
		const result = mockGetTestPlan(103);
		assert.ok(result.content[0].text.includes("Smoke Tests"));
	});
});

// ---------------------------------------------------------------------------
// mockListTestSuites
// ---------------------------------------------------------------------------

describe("mockListTestSuites", () => {
	it("returns suites for plan 101", () => {
		const result = mockListTestSuites(101);
		assert.equal(result.details.count, 4);
	});

	it("returns suites for plan 102", () => {
		const result = mockListTestSuites(102);
		assert.equal(result.details.count, 2);
	});

	it("returns empty for unknown plan", () => {
		const result = mockListTestSuites(999);
		assert.ok(
			result.details.count === 0 ||
			result.content[0].text.includes("No test suites") ||
			result.content[0].text.includes("not found"),
		);
	});
});

// ---------------------------------------------------------------------------
// mockGetTestSuite
// ---------------------------------------------------------------------------

describe("mockGetTestSuite", () => {
	it("returns suite by ID", () => {
		const result = mockGetTestSuite(101, 301);
		assert.equal(result.details.suiteId, 301);
	});

	it("returns error for unknown suite", () => {
		const result = mockGetTestSuite(101, 999);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// mockListTestCases
// ---------------------------------------------------------------------------

describe("mockListTestCases", () => {
	it("returns cases for known suite", () => {
		const result = mockListTestCases(101, 301);
		assert.ok(result.details.count > 0);
	});

	it("handles unknown suite", () => {
		const result = mockListTestCases(101, 999);
		assert.ok(
			result.details.count === 0 ||
			result.content[0].text.includes("No test cases") ||
			result.content[0].text.includes("not found"),
		);
	});
});

// ---------------------------------------------------------------------------
// mockListTestPoints
// ---------------------------------------------------------------------------

describe("mockListTestPoints", () => {
	it("returns points for known suite", () => {
		const result = mockListTestPoints(101, 301);
		assert.ok(result.details.count > 0);
	});

	it("handles unknown suite", () => {
		const result = mockListTestPoints(101, 999);
		assert.ok(
			result.details.count === 0 ||
			result.content[0].text.includes("No test points") ||
			result.content[0].text.includes("not found"),
		);
	});
});

// ---------------------------------------------------------------------------
// mockCreateTestRun
// ---------------------------------------------------------------------------

describe("mockCreateTestRun", () => {
	it("creates run with name", () => {
		const result = mockCreateTestRun(101, [301], "My Test Run");
		assert.ok(result.content[0].text.includes("My Test Run"));
		assert.equal(result.details.planId, 101);
	});

	it("creates run without name", () => {
		const result = mockCreateTestRun(101, [301]);
		assert.ok(result.details.planId === 101);
	});
});

// ---------------------------------------------------------------------------
// mockUpdateTestResults
// ---------------------------------------------------------------------------

describe("mockUpdateTestResults", () => {
	it("updates results", () => {
		const result = mockUpdateTestResults(501, [
			{ testCaseResultId: 1, outcome: "passed" },
			{ testCaseResultId: 2, outcome: "failed" },
		]);
		assert.equal(result.details.updatedCount, 2);
		assert.equal(result.details.runId, 501);
	});
});

// ---------------------------------------------------------------------------
// mockGetTestRun
// ---------------------------------------------------------------------------

describe("mockGetTestRun", () => {
	it("returns run 501", () => {
		const result = mockGetTestRun(501);
		assert.equal(result.details.runId, 501);
	});

	it("returns run 502", () => {
		const result = mockGetTestRun(502);
		assert.equal(result.details.runId, 502);
	});

	it("returns error for unknown run", () => {
		const result = mockGetTestRun(999);
		assert.ok(result.content[0].text.includes("not found"));
		assert.equal(result.details.error, true);
	});
});

// ---------------------------------------------------------------------------
// mockListTestRuns
// ---------------------------------------------------------------------------

describe("mockListTestRuns", () => {
	it("returns all runs", () => {
		const result = mockListTestRuns();
		assert.equal(result.details.count, 3);
	});

	it("filters by planId", () => {
		const result = mockListTestRuns({ planId: 101 });
		assert.ok(result.details.count > 0);
	});
});

// ---------------------------------------------------------------------------
// mockGetTestResults
// ---------------------------------------------------------------------------

describe("mockGetTestResults", () => {
	it("returns results for run 501", () => {
		const result = mockGetTestResults(501);
		assert.ok(result.details.count > 0);
	});

	it("returns error for unknown run", () => {
		const result = mockGetTestResults(999);
		assert.ok(
			result.content[0].text.includes("not found") ||
			result.details.count === 0,
		);
	});
});
